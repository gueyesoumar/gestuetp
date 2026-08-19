-- Migration 00200 (UP) : quotas rebranchés sur le modèle d'abonnement (RFC 0006, P2, 10.4)
--
-- Déplace la source des limites de plans.max_* vers un modèle à deux niveaux :
--   plan_quotas       = quota par défaut d'un bundle (catalogue)
--   org_quota_limits  = limite EFFECTIVE par org (semée du plan, surchargeable en console P4)
-- Les fonctions d'enforcement 00125 lisent désormais org_quota_limits AVEC FALLBACK
-- sur plans.max_* → comportement STRICTEMENT identique à limites égales. Triggers et
-- exemption 'platform' inchangés.

-- 1. Quota par défaut d'un plan (catalogue) ------------------------------------
create table if not exists public.plan_quotas (
  plan_slug   text not null,
  quota_key   text not null,           -- 'users' | 'missions' | … (extensible)
  limit_value int,                      -- NULL = illimité
  primary key (plan_slug, quota_key)
);
comment on table public.plan_quotas is
  'Quota par défaut livré par un bundle (RFC 0006 §4.2). Sert à semer org_quota_limits à l''application d''un plan.';

-- 2. Limite effective par org (enforced) ---------------------------------------
create table if not exists public.org_quota_limits (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quota_key       text not null,
  limit_value     int,                  -- NULL = illimité
  primary key (organization_id, quota_key)
);
comment on table public.org_quota_limits is
  'Limite de quota EFFECTIVE et enforced par org (RFC 0006 §4.2). Semée du plan, surchargeable (console P4). Absent = fallback plans.max_* puis illimité.';

-- 3. Seed plan_quotas depuis les colonnes plans.max_* --------------------------
insert into public.plan_quotas (plan_slug, quota_key, limit_value)
select p.slug, 'users', p.max_users from public.plans p where p.max_users is not null
union all
select p.slug, 'missions', p.max_missions from public.plans p where p.max_missions is not null
on conflict (plan_slug, quota_key) do nothing;

-- 4. Backfill org_quota_limits depuis le plan de chaque org --------------------
insert into public.org_quota_limits (organization_id, quota_key, limit_value)
select o.id, 'users', p.max_users
from public.organizations o join public.plans p on p.id = o.plan_id
where p.max_users is not null
union all
select o.id, 'missions', p.max_missions
from public.organizations o join public.plans p on p.id = o.plan_id
where p.max_missions is not null
on conflict (organization_id, quota_key) do nothing;

-- 5. Réécriture des fonctions d'enforcement (lecture org_quota_limits + fallback)
create or replace function public.check_user_quota(p_org_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_max int; v_current int; v_types text[];
begin
  if p_org_id is null then return jsonb_build_object('ok', true, 'reason', 'no_org'); end if;
  select types into v_types from public.organizations where id = p_org_id;
  if v_types is null then return jsonb_build_object('ok', true, 'reason', 'org_not_found'); end if;
  if 'platform' = any(v_types) then return jsonb_build_object('ok', true, 'reason', 'platform_org_exempt'); end if;

  -- Limite effective : org_quota_limits (RFC 0006), fallback plans.max_users.
  select limit_value into v_max from public.org_quota_limits
  where organization_id = p_org_id and quota_key = 'users';
  if not found then
    select pl.max_users into v_max
    from public.organizations o left join public.plans pl on pl.id = o.plan_id
    where o.id = p_org_id;
  end if;

  if v_max is null then return jsonb_build_object('ok', true, 'reason', 'unlimited'); end if;

  select count(*) into v_current from public.users
  where organization_id = p_org_id and is_active = true;

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

  select limit_value into v_max from public.org_quota_limits
  where organization_id = p_cabinet_id and quota_key = 'missions';
  if not found then
    select pl.max_missions into v_max
    from public.organizations o left join public.plans pl on pl.id = o.plan_id
    where o.id = p_cabinet_id;
  end if;

  if v_max is null then return jsonb_build_object('ok', true, 'reason', 'unlimited'); end if;

  select count(*) into v_current from public.missions
  where cabinet_id = p_cabinet_id and is_active = true;

  if v_current >= v_max then
    return jsonb_build_object('ok', false, 'current', v_current, 'max', v_max, 'error', 'mission_quota_exceeded');
  end if;
  return jsonb_build_object('ok', true, 'current', v_current, 'max', v_max);
end; $$;

-- 6. RLS : plan_quotas lisible authenticated ; org_quota_limits own-org + is_aal2
alter table public.plan_quotas enable row level security;
drop policy if exists plan_quotas_select_all on public.plan_quotas;
create policy plan_quotas_select_all on public.plan_quotas for select to authenticated using (true);

alter table public.org_quota_limits enable row level security;
drop policy if exists "oql_org" on public.org_quota_limits;
create policy "oql_org" on public.org_quota_limits for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
drop policy if exists "oql_aal2" on public.org_quota_limits;
create policy "oql_aal2" on public.org_quota_limits as restrictive for all to authenticated using (public.is_aal2());
