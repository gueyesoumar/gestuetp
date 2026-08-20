-- Migration 00202 (UP) : primitives d'abonnement (RFC 0006, Phase 4a)
--
-- Fonctions de LECTURE pour la console superadmin. La RLS de org_subscriptions est
-- own-org : le superadmin ne peut pas lire les abonnements d'une AUTRE org via le
-- client. Ces primitives SECURITY DEFINER exposent l'état/MRR de façon contrôlée
-- (superadmin OU own-org staff), sans jamais fuiter de prix cross-org.
--
-- Aucune écriture, aucun impact sur le gating (le flip = C+P3).

-- MRR net d'une org : Σ (prix produit + features actives) × (1 − remise produit) ×
-- (1 − remise org). Seuls les abonnements ACTIVE comptent (trial/suspended = 0 €).
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
comment on function public.org_mrr(uuid) is
  'MRR net d''une org (RFC 0006 §4.2) : abonnements actifs, remises produit puis org. SECURITY DEFINER.';

-- MRR agrégé du portefeuille — SUPERADMIN uniquement (aucune fuite cross-org).
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
comment on function public.platform_mrr() is
  'MRR agrégé de toutes les orgs (portefeuille superadmin). Réservé is_platform_owner.';

-- État d'abonnement complet d'une org (produits/statuts/features/remise/accueil/MRR)
-- pour la console. Accès : superadmin OU own-org staff.
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
        'unit_price_eur', s.unit_price_eur,
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
comment on function public.org_subscription_state(uuid) is
  'État d''abonnement complet d''une org (console RFC 0006 §7). Accès superadmin ou own-org staff.';

grant execute on function public.org_mrr(uuid) to authenticated;
grant execute on function public.platform_mrr() to authenticated;
grant execute on function public.org_subscription_state(uuid) to authenticated;
