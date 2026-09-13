-- Migration 00242 (UP) : bascule du read-path (RFC 0008 P2 / INC 3)
--
-- org_entitlements devient la SOURCE DE VÉRITÉ EN LECTURE pour capacités + quotas +
-- MRR. Le write-path reste inchangé (admin-subscription écrit org_subscriptions /
-- org_quota_limits) : un PONT reflète ces écritures dans org_entitlements en temps
-- réel. Le pont est transitoire — INC 4 (console écrivant org_entitlements) le
-- supprimera.
--
-- Invariance : org_entitlements est un miroir fidèle du backfill (00241) ; les
-- lecteurs repointés rendent le même résultat. Les replis plans.max_* sont conservés
-- → provisioning des nouvelles orgs jamais cassé.

-- ============================================================================
-- 1. PONT : org_subscriptions / features / org_quota_limits → org_entitlements
-- ============================================================================

-- 1a. Régénère les lignes PRODUIT + FEATURE d'une org depuis ses abonnements.
create or replace function public.sync_entitlements_from_subscription(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- N'efface QUE les lignes produit/feature (jamais les quotas users/missions).
  delete from public.org_entitlements
  where organization_id = p_org and key not in ('users', 'missions');

  insert into public.org_entitlements
    (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, discount_pct, source, capability, granted_at)
  select s.organization_id, s.product_key, s.status, s.trial_ends_at,
         case when s.unit_price > 0 then 'flat' else 'none' end,
         nullif(s.unit_price, 0),
         case when s.unit_price > 0 then 'month' end,
         s.discount_pct,
         coalesce('plan:' || s.plan_slug, 'subscription'),
         (select pc.capability from public.product_capability pc
          where pc.product_key = s.product_key order by pc.capability limit 1),
         s.started_at
  from public.org_subscriptions s
  where s.organization_id = p_org
  on conflict (organization_id, key) do nothing;

  insert into public.org_entitlements
    (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select s.organization_id, f.feature_key, s.status, s.trial_ends_at,
         case when f.unit_price > 0 then 'flat' else 'none' end,
         nullif(f.unit_price, 0),
         case when f.unit_price > 0 then 'month' end,
         'subscription',
         (select pf.capability from public.product_features pf
          where pf.product_key = s.product_key and pf.key = f.feature_key),
         s.started_at
  from public.org_subscription_features f
  join public.org_subscriptions s on s.id = f.subscription_id
  where s.organization_id = p_org
  on conflict (organization_id, key) do nothing;

  perform public.refresh_org_capabilities(p_org);
end $$;

-- 1b. Régénère les lignes QUOTA (users/missions) d'une org (limite effective).
create or replace function public.sync_entitlements_quota(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.org_entitlements where organization_id = p_org and key in ('users', 'missions');
  insert into public.org_entitlements (organization_id, key, limit_value, pricing_kind, source, granted_at)
  select p_org, q.quota_key,
         coalesce(
           (select ql.limit_value from public.org_quota_limits ql
            where ql.organization_id = p_org and ql.quota_key = q.quota_key),
           case q.quota_key when 'users' then p.max_users when 'missions' then p.max_missions end
         ),
         'none', 'sync', now()
  from (values ('users'), ('missions')) as q(quota_key)
  left join public.organizations o on o.id = p_org
  left join public.plans p on p.id = o.plan_id
  where o.plan_id is not null
     or exists (select 1 from public.org_quota_limits ql where ql.organization_id = p_org);
  -- Les quotas n'ont pas de capacité → pas de refresh nécessaire.
end $$;

-- 1c. Fonctions de trigger du pont.
create or replace function public.trg_bridge_sub()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_entitlements_from_subscription(coalesce(new.organization_id, old.organization_id));
  return null;
end $$;

create or replace function public.trg_bridge_sub_feat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.org_subscriptions
  where id = coalesce(new.subscription_id, old.subscription_id);
  if v_org is not null then perform public.sync_entitlements_from_subscription(v_org); end if;
  return null;
end $$;

create or replace function public.trg_bridge_quota()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_entitlements_quota(coalesce(new.organization_id, old.organization_id));
  return null;
end $$;

-- 1d. Remplace les triggers 00206 (sub → refresh) par le pont (sub → entitlements → refresh).
drop trigger if exists trg_org_sub_refresh on public.org_subscriptions;
drop trigger if exists trg_org_sub_feat_refresh on public.org_subscription_features;

create trigger trg_bridge_sub
  after insert or update or delete on public.org_subscriptions
  for each row execute function public.trg_bridge_sub();
create trigger trg_bridge_sub_feat
  after insert or update or delete on public.org_subscription_features
  for each row execute function public.trg_bridge_sub_feat();
create trigger trg_bridge_quota
  after insert or update or delete on public.org_quota_limits
  for each row execute function public.trg_bridge_quota();

-- ============================================================================
-- 2. REPOINTAGE DES LECTEURS sur org_entitlements
-- ============================================================================

-- 2a. Projection des capacités : depuis org_entitlements (au lieu de org_subscriptions).
create or replace function public.refresh_org_capabilities(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  with mapped as (
    select e.capability,
           (case when bool_or(e.status = 'active') then 'active' else 'trial' end)::public.capability_status as status
    from public.org_entitlements e
    where e.organization_id = p_org
      and e.capability is not null
      and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
    group by e.capability
  )
  insert into public.organization_capabilities (org_id, capability, status)
  select p_org, capability, status from mapped
  on conflict (org_id, capability) do update set status = excluded.status;

  delete from public.organization_capabilities oc
  where oc.org_id = p_org
    and not exists (
      select 1 from public.org_entitlements e
      where e.organization_id = p_org and e.capability = oc.capability
        and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
    );
end $$;

-- 2b. Enforcement quota utilisateurs : org_entitlements.limit_value (repli plans.max_*).
create or replace function public.check_user_quota(p_org_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_max int; v_current int; v_types text[];
begin
  if p_org_id is null then return jsonb_build_object('ok', true, 'reason', 'no_org'); end if;
  select types into v_types from public.organizations where id = p_org_id;
  if v_types is null then return jsonb_build_object('ok', true, 'reason', 'org_not_found'); end if;
  if 'platform' = any(v_types) then return jsonb_build_object('ok', true, 'reason', 'platform_org_exempt'); end if;

  -- Limite effective : org_entitlements (RFC 0008), repli plans.max_users.
  select limit_value into v_max from public.org_entitlements
  where organization_id = p_org_id and key = 'users';
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

-- 2c. Enforcement quota missions : org_entitlements.limit_value (repli plans.max_*).
create or replace function public.check_mission_quota(p_cabinet_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_max int; v_current int; v_types text[];
begin
  if p_cabinet_id is null then return jsonb_build_object('ok', true, 'reason', 'no_cabinet'); end if;
  select types into v_types from public.organizations where id = p_cabinet_id;
  if v_types is null then return jsonb_build_object('ok', true, 'reason', 'org_not_found'); end if;
  if 'platform' = any(v_types) then return jsonb_build_object('ok', true, 'reason', 'platform_org_exempt'); end if;

  select limit_value into v_max from public.org_entitlements
  where organization_id = p_cabinet_id and key = 'missions';
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

-- 2d. MRR : depuis org_entitlements (lignes récurrentes actives, remise ligne puis org).
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
    sum(coalesce(price_amount, 0) * (1 - discount_pct / 100.0))
      * (1 - coalesce((select discount_pct from public.organizations where id = p_org), 0) / 100.0)
  , 0), 0)
  into v_total
  from public.org_entitlements
  where organization_id = p_org
    and status = 'active'
    and pricing_kind in ('flat', 'metered')      -- récurrent ; 'per_unit' = usage, 'none' = gratuit
    and price_amount is not null;

  return v_total;
end; $$;

-- 2e. Quota effectif (UI) : depuis org_entitlements (repli plans.max_*).
create or replace function public.org_effective_quota()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; v_users int; v_missions int;
begin
  v_org := public.get_my_organization_id();
  if v_org is null then return jsonb_build_object('users', null, 'missions', null); end if;

  select limit_value into v_users from public.org_entitlements where organization_id = v_org and key = 'users';
  if not found then
    select pl.max_users into v_users from public.organizations o left join public.plans pl on pl.id = o.plan_id where o.id = v_org;
  end if;

  select limit_value into v_missions from public.org_entitlements where organization_id = v_org and key = 'missions';
  if not found then
    select pl.max_missions into v_missions from public.organizations o left join public.plans pl on pl.id = o.plan_id where o.id = v_org;
  end if;

  return jsonb_build_object('users', v_users, 'missions', v_missions);
end; $$;

-- ============================================================================
-- 3. Régénération + garde d'invariance
-- ============================================================================
-- Recalcule organization_capabilities depuis org_entitlements pour toutes les orgs,
-- puis vérifie l'invariance (doit être 0).
do $$
declare r record; v_diff int;
begin
  for r in select id from public.organizations loop
    perform public.refresh_org_capabilities(r.id);
  end loop;
  select count(*) into v_diff from public.verify_entitlement_invariance();
  raise notice '[00242] Invariance capacites apres bascule : % ecart(s) (attendu 0)', v_diff;
  raise notice '[00242] MRR plateforme (org_entitlements) : %', public.platform_mrr();
end $$;
