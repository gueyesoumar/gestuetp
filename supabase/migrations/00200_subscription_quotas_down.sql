-- Migration 00200 (DOWN) : rollback quotas RFC 0006 → retour au modèle 00125
--
-- Restaure les fonctions d'enforcement lisant plans.max_* (logique 00125) puis
-- supprime les tables. Le fallback rendait déjà le comportement identique ; ce down
-- rétablit la lecture directe de plans.max_*.

create or replace function public.check_user_quota(p_org_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_max int; v_current int; v_types text[];
begin
  if p_org_id is null then return jsonb_build_object('ok', true, 'reason', 'no_org'); end if;
  select types into v_types from public.organizations where id = p_org_id;
  if v_types is null then return jsonb_build_object('ok', true, 'reason', 'org_not_found'); end if;
  if 'platform' = any(v_types) then return jsonb_build_object('ok', true, 'reason', 'platform_org_exempt'); end if;
  select pl.max_users into v_max
  from public.organizations o left join public.plans pl on pl.id = o.plan_id
  where o.id = p_org_id;
  if v_max is null then return jsonb_build_object('ok', true, 'reason', 'unlimited'); end if;
  select count(*) into v_current from public.users where organization_id = p_org_id and is_active = true;
  if v_current >= v_max then
    return jsonb_build_object('ok', false, 'current', v_current, 'max', v_max, 'error', 'user_quota_exceeded');
  end if;
  return jsonb_build_object('ok', true, 'current', v_current, 'max', v_max);
end; $$;

create or replace function public.check_mission_quota(p_cabinet_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_max int; v_current int; v_types text[];
begin
  if p_cabinet_id is null then return jsonb_build_object('ok', true, 'reason', 'no_cabinet'); end if;
  select types into v_types from public.organizations where id = p_cabinet_id;
  if v_types is null then return jsonb_build_object('ok', true, 'reason', 'org_not_found'); end if;
  if 'platform' = any(v_types) then return jsonb_build_object('ok', true, 'reason', 'platform_org_exempt'); end if;
  select pl.max_missions into v_max
  from public.organizations o left join public.plans pl on pl.id = o.plan_id
  where o.id = p_cabinet_id;
  if v_max is null then return jsonb_build_object('ok', true, 'reason', 'unlimited'); end if;
  select count(*) into v_current from public.missions where cabinet_id = p_cabinet_id and is_active = true;
  if v_current >= v_max then
    return jsonb_build_object('ok', false, 'current', v_current, 'max', v_max, 'error', 'mission_quota_exceeded');
  end if;
  return jsonb_build_object('ok', true, 'current', v_current, 'max', v_max);
end; $$;

drop policy if exists "oql_aal2" on public.org_quota_limits;
drop policy if exists "oql_org"  on public.org_quota_limits;
drop policy if exists plan_quotas_select_all on public.plan_quotas;

drop table if exists public.org_quota_limits;
drop table if exists public.plan_quotas;
