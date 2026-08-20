-- Migration 00203 (UP) : devise de base FCFA (XOF) + taux de change (RFC 0006 P4)
--
-- Les montants sont désormais stockés en FCFA (devise comptable de base). Les
-- colonnes de prix, héritées avec un suffixe _eur trompeur (et à 0 partout), sont
-- renommées en neutre. L'affichage en € / $ est une CONVERSION (front) : XOF↔EUR
-- est une parité FIXE (655,957), seul EUR↔USD flotte (table fx_rates, rafraîchie
-- par l'edge fx-rate). Aucune donnée réelle impactée (prix = 0).

-- 1. Renommage base XOF ---------------------------------------------------------
alter table public.products               rename column monthly_price_eur to monthly_price;
alter table public.product_features       rename column monthly_price_eur to monthly_price;
alter table public.org_subscriptions      rename column unit_price_eur   to unit_price;
alter table public.org_subscription_features rename column unit_price_eur to unit_price;

comment on column public.products.monthly_price is 'Prix socle mensuel du produit, en FCFA (XOF). Devise de base RFC 0006.';
comment on column public.org_subscriptions.unit_price is 'Prix figé à la souscription, en FCFA (XOF).';

-- 2. Recréation des fonctions sur les nouveaux noms -----------------------------
create or replace function public.org_mrr(p_org uuid)
returns numeric language sql stable security definer set search_path = public as $$
  with lines as (
    select s.discount_pct,
           s.unit_price
             + coalesce((select sum(f.unit_price)
                         from public.org_subscription_features f
                         where f.subscription_id = s.id), 0) as gross
    from public.org_subscriptions s
    where s.organization_id = p_org and s.status = 'active'
  )
  select coalesce(round(
    sum(gross * (1 - discount_pct / 100.0))
      * (1 - coalesce((select discount_pct from public.organizations where id = p_org), 0) / 100.0)
  , 0), 0)
  from lines;
$$;

create or replace function public.org_subscription_state(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_owner boolean; v_myorg uuid; v_result jsonb;
begin
  select is_platform_owner into v_owner from public.users where auth_id = auth.uid();
  v_myorg := public.get_my_organization_id();
  if not coalesce(v_owner, false) and (v_myorg is distinct from p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'organization_id', p_org,
    'discount_pct', (select discount_pct from public.organizations where id = p_org),
    'home_product', (select home_product from public.organizations where id = p_org),
    'mrr', public.org_mrr(p_org),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_key', s.product_key,
        'status', s.status,
        'trial_ends_at', s.trial_ends_at,
        'unit_price', s.unit_price,
        'discount_pct', s.discount_pct,
        'plan_slug', s.plan_slug,
        'features', coalesce((select jsonb_agg(f.feature_key order by f.feature_key)
                              from public.org_subscription_features f
                              where f.subscription_id = s.id), '[]'::jsonb)
      ) order by s.product_key)
      from public.org_subscriptions s where s.organization_id = p_org), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;

-- 3. Taux de change EUR↔USD (cache, rafraîchi par l'edge fx-rate) ---------------
create table if not exists public.fx_rates (
  quote      text primary key,          -- ex 'USD' : 1 EUR = per_eur <quote>
  per_eur    numeric not null,
  updated_at timestamptz not null default now()
);
comment on table public.fx_rates is
  'Cache des taux de change par rapport à l''EUR (RFC 0006). Rafraîchi par l''edge fx-rate (ECB/frankfurter). XOF↔EUR reste une parité fixe côté code (655,957).';

insert into public.fx_rates (quote, per_eur) values ('USD', 1.08)
on conflict (quote) do nothing;  -- seed de repli

alter table public.fx_rates enable row level security;
drop policy if exists fx_rates_select_all on public.fx_rates;
create policy fx_rates_select_all on public.fx_rates for select to authenticated using (true);
