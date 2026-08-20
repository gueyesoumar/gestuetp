-- Migration 00203 (DOWN) : retour aux colonnes _eur + fonctions 00202 + drop fx_rates

alter table public.products               rename column monthly_price to monthly_price_eur;
alter table public.product_features       rename column monthly_price to monthly_price_eur;
alter table public.org_subscriptions      rename column unit_price   to unit_price_eur;
alter table public.org_subscription_features rename column unit_price to unit_price_eur;

create or replace function public.org_mrr(p_org uuid)
returns numeric language sql stable security definer set search_path = public as $$
  with lines as (
    select s.discount_pct,
           s.unit_price_eur
             + coalesce((select sum(f.unit_price_eur)
                         from public.org_subscription_features f
                         where f.subscription_id = s.id), 0) as gross
    from public.org_subscriptions s
    where s.organization_id = p_org and s.status = 'active'
  )
  select coalesce(round(
    sum(gross * (1 - discount_pct / 100.0))
      * (1 - coalesce((select discount_pct from public.organizations where id = p_org), 0) / 100.0)
  , 2), 0)
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
        'product_key', s.product_key, 'status', s.status, 'trial_ends_at', s.trial_ends_at,
        'unit_price_eur', s.unit_price_eur, 'discount_pct', s.discount_pct, 'plan_slug', s.plan_slug,
        'features', coalesce((select jsonb_agg(f.feature_key order by f.feature_key)
                              from public.org_subscription_features f where f.subscription_id = s.id), '[]'::jsonb)
      ) order by s.product_key)
      from public.org_subscriptions s where s.organization_id = p_org), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;

drop table if exists public.fx_rates;
