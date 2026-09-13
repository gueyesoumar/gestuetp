-- Migration 00242 (DOWN) : re-pointe les lecteurs sur org_subscriptions / org_quota_limits
-- et retire le pont. org_entitlements redevient dormante (backfill 00241 conservé).

-- 1. Retire le pont --------------------------------------------------------------
drop trigger if exists trg_bridge_sub on public.org_subscriptions;
drop trigger if exists trg_bridge_sub_feat on public.org_subscription_features;
drop trigger if exists trg_bridge_quota on public.org_quota_limits;
drop function if exists public.trg_bridge_sub();
drop function if exists public.trg_bridge_sub_feat();
drop function if exists public.trg_bridge_quota();
drop function if exists public.sync_entitlements_from_subscription(uuid);
drop function if exists public.sync_entitlements_quota(uuid);

-- 2. Restaure refresh_org_capabilities (00206 : lecture org_subscriptions) --------
create or replace function public.refresh_org_capabilities(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  with target as (
    select pc.capability, s.status
    from public.org_subscriptions s
    join public.product_capability pc on pc.product_key = s.product_key
    where s.organization_id = p_org
      and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
    union
    select pf.capability, s.status
    from public.org_subscriptions s
    join public.org_subscription_features f on f.subscription_id = s.id
    join public.product_features pf on pf.product_key = s.product_key and pf.key = f.feature_key
    where s.organization_id = p_org
      and pf.capability is not null
      and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
  ),
  mapped as (
    select capability,
           (case when bool_or(status = 'active') then 'active' else 'trial' end)::public.capability_status as status
    from target group by capability
  )
  insert into public.organization_capabilities (org_id, capability, status)
  select p_org, capability, status from mapped
  on conflict (org_id, capability) do update set status = excluded.status;

  delete from public.organization_capabilities oc
  where oc.org_id = p_org
    and not exists (
      select 1 from public.org_subscriptions s
      join public.product_capability pc on pc.product_key = s.product_key and pc.capability = oc.capability
      where s.organization_id = p_org
        and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
      union
      select 1 from public.org_subscriptions s
      join public.org_subscription_features f on f.subscription_id = s.id
      join public.product_features pf on pf.product_key = s.product_key and pf.key = f.feature_key and pf.capability = oc.capability
      where s.organization_id = p_org
        and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
    );
end $$;

-- 3. Restaure les triggers 00206 (org_subscriptions → refresh) -------------------
create or replace function public.trg_refresh_org_caps()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_org_capabilities(coalesce(new.organization_id, old.organization_id));
  return null;
end $$;

create or replace function public.trg_refresh_org_caps_feat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.org_subscriptions
  where id = coalesce(new.subscription_id, old.subscription_id);
  if v_org is not null then perform public.refresh_org_capabilities(v_org); end if;
  return null;
end $$;

create trigger trg_org_sub_refresh
  after insert or update or delete on public.org_subscriptions
  for each row execute function public.trg_refresh_org_caps();
create trigger trg_org_sub_feat_refresh
  after insert or update or delete on public.org_subscription_features
  for each row execute function public.trg_refresh_org_caps_feat();

-- 4. Restaure check_user_quota / check_mission_quota (00200 : org_quota_limits) ---
create or replace function public.check_user_quota(p_org_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_max int; v_current int; v_types text[];
begin
  if p_org_id is null then return jsonb_build_object('ok', true, 'reason', 'no_org'); end if;
  select types into v_types from public.organizations where id = p_org_id;
  if v_types is null then return jsonb_build_object('ok', true, 'reason', 'org_not_found'); end if;
  if 'platform' = any(v_types) then return jsonb_build_object('ok', true, 'reason', 'platform_org_exempt'); end if;

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

-- 5. Restaure org_mrr / org_effective_quota (INC 1 : org_subscriptions / org_quota_limits)
create or replace function public.org_mrr(p_org uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_total numeric;
begin
  if not (public.is_platform_owner()
          or p_org = public.get_my_organization_id()
          or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(round(
    sum(gross * (1 - discount_pct / 100.0))
      * (1 - coalesce((select discount_pct from public.organizations where id = p_org), 0) / 100.0)
  , 0), 0)
  into v_total
  from (
    select s.discount_pct,
           s.unit_price
             + coalesce((select sum(f.unit_price)
                         from public.org_subscription_features f
                         where f.subscription_id = s.id), 0) as gross
    from public.org_subscriptions s
    where s.organization_id = p_org and s.status = 'active'
  ) lines;

  return v_total;
end; $$;

create or replace function public.org_effective_quota()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select public.get_my_organization_id() as org_id)
  select jsonb_build_object(
    'users', coalesce(
      (select ql.limit_value from public.org_quota_limits ql, me
       where ql.organization_id = me.org_id and ql.quota_key = 'users'),
      (select p.max_users from public.organizations o join public.plans p on p.id = o.plan_id, me
       where o.id = me.org_id)
    ),
    'missions', coalesce(
      (select ql.limit_value from public.org_quota_limits ql, me
       where ql.organization_id = me.org_id and ql.quota_key = 'missions'),
      (select p.max_missions from public.organizations o join public.plans p on p.id = o.plan_id, me
       where o.id = me.org_id)
    )
  );
$$;

-- 6. Recalcule organization_capabilities depuis org_subscriptions ----------------
do $$
declare r record;
begin
  for r in select id from public.organizations loop
    perform public.refresh_org_capabilities(r.id);
  end loop;
end $$;
