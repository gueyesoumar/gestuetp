-- Migration 00246 (UP) : RPC de lecture des entitlements (RFC 0008 / INC 5b)
--
-- État complet des entitlements d'une org pour la console superadmin. SECURITY
-- DEFINER, garde superadmin OU own-org staff (même patron que org_subscription_state,
-- 00202). Ne fuite aucun prix cross-org.

create or replace function public.org_entitlement_state(p_org uuid)
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
    'entitlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', e.key,
        'status', e.status,
        'trial_ends_at', e.trial_ends_at,
        'capability', e.capability,
        'limit_value', e.limit_value,
        'pricing_kind', e.pricing_kind,
        'price_amount', e.price_amount,
        'price_unit', e.price_unit,
        'included_qty', e.included_qty,
        'discount_pct', e.discount_pct,
        'enforcement', e.enforcement,
        'source', e.source
      ) order by e.key)
      from public.org_entitlements e where e.organization_id = p_org), '[]'::jsonb),
    'gate_policy', coalesce((
      select jsonb_object_agg(key, enforcement) from public.entitlement_gate_policy), '{}'::jsonb)
  ) into v_result;
  return v_result;
end $$;
comment on function public.org_entitlement_state(uuid) is
  'État des entitlements d''une org (console RFC 0008 §7). Accès superadmin ou own-org staff.';

grant execute on function public.org_entitlement_state(uuid) to authenticated;
