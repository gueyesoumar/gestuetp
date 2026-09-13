-- Migration 00240 (DOWN) : restaure l'état 00202/00203.

drop function if exists public.org_effective_quota();

-- Restaure platform_mrr (00202) : superadmin uniquement, pas de passe-droit serveur.
create or replace function public.platform_mrr()
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_owner boolean; v_total numeric;
begin
  select is_platform_owner into v_owner from public.users where auth_id = auth.uid();
  if not coalesce(v_owner, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(sum(public.org_mrr(o.id)), 0) into v_total from public.organizations o;
  return v_total;
end; $$;

-- Restaure org_mrr (00203) : SQL sans garde.
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
