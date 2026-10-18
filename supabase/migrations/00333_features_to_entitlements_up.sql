-- 00333 - RFC 0018 Phase 1 : rapatrier les FONCTIONNALITÉS dans org_entitlements.
--
-- Les feature flags (pile indépendante plan_id -> plan_features, + overrides + kill-switch
-- global) deviennent des entitlements `feature.<slug>`. useFeatureFlag lira la MÊME pile
-- que hasCapability. ISO-ACCÈS : le backfill reproduit l'état effectif actuel ; un pont
-- (triggers) maintient la synchro tant que l'UI d'écriture reste sur les anciennes tables
-- (retrait en Phase 6). Enforcement inchangé (soft). Clés préfixées `feature.` (D1 partiel ;
-- le renommage des modules/quotas en module.*/quota.* viendra en Phase 2).

-- Recompute l'entitlement feature.<slug> d'une (org, flag) depuis l'état effectif :
-- kill-switch global -> override d'org -> appartenance au plan. source='bridge'. Ne touche
-- JAMAIS une ligne source='manual' (octroi hors plan préservé).
create or replace function public.recompute_feature_entitlement(p_org uuid, p_flag_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_slug text; v_global boolean; v_plan uuid; v_ovr boolean; v_eff boolean; v_key text; v_found boolean;
begin
  select slug, is_globally_enabled into v_slug, v_global from public.feature_flags where id = p_flag_id;
  if v_slug is null then return; end if;
  v_key := 'feature.' || v_slug;

  if not coalesce(v_global, false) then
    v_eff := false;
  else
    select enabled into v_ovr from public.feature_flag_overrides
      where flag_id = p_flag_id and organization_id = p_org;
    v_found := found;
    if v_found then
      v_eff := v_ovr;
    else
      select plan_id into v_plan from public.organizations where id = p_org;
      v_eff := exists (select 1 from public.plan_features where plan_id = v_plan and flag_id = p_flag_id);
    end if;
  end if;

  if v_eff then
    insert into public.org_entitlements (organization_id, key, status, source, capability)
    values (p_org, v_key, 'active', 'bridge', null)
    on conflict (organization_id, key) do update
      set status = 'active', updated_at = now()
      where org_entitlements.source in ('bridge', 'backfill');
  else
    delete from public.org_entitlements
    where organization_id = p_org and key = v_key and source in ('bridge', 'backfill');
  end if;
end;
$$;
revoke all on function public.recompute_feature_entitlement(uuid, uuid) from public;

-- Backfill (one-shot) : tous les couples (org, flag).
do $$
declare o record; f record;
begin
  for o in select id from public.organizations loop
    for f in select id from public.feature_flags loop
      perform public.recompute_feature_entitlement(o.id, f.id);
    end loop;
  end loop;
end $$;

-- Pont : override modifié -> recompute (org, flag).
create or replace function public.trg_ff_override_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_feature_entitlement(
    coalesce(new.organization_id, old.organization_id),
    coalesce(new.flag_id, old.flag_id));
  return null;
end; $$;
drop trigger if exists ff_override_recompute on public.feature_flag_overrides;
create trigger ff_override_recompute after insert or update or delete on public.feature_flag_overrides
  for each row execute function public.trg_ff_override_recompute();

-- Pont : matrice plan_features modifiée -> recompute toutes les orgs de ce plan.
create or replace function public.trg_plan_feature_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from public.organizations where plan_id = coalesce(new.plan_id, old.plan_id) loop
    perform public.recompute_feature_entitlement(r.id, coalesce(new.flag_id, old.flag_id));
  end loop;
  return null;
end; $$;
drop trigger if exists plan_feature_recompute on public.plan_features;
create trigger plan_feature_recompute after insert or delete on public.plan_features
  for each row execute function public.trg_plan_feature_recompute();

-- Pont : kill-switch global modifié -> recompute toutes les orgs pour ce flag.
create or replace function public.trg_ff_global_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.is_globally_enabled is distinct from old.is_globally_enabled then
    for r in select id from public.organizations loop
      perform public.recompute_feature_entitlement(r.id, new.id);
    end loop;
  end if;
  return null;
end; $$;
drop trigger if exists ff_global_recompute on public.feature_flags;
create trigger ff_global_recompute after update on public.feature_flags
  for each row execute function public.trg_ff_global_recompute();

-- Pont : changement de plan d'une org -> recompute tous les flags pour cette org.
create or replace function public.trg_org_plan_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.plan_id is distinct from old.plan_id then
    for r in select id from public.feature_flags loop
      perform public.recompute_feature_entitlement(new.id, r.id);
    end loop;
  end if;
  return null;
end; $$;
drop trigger if exists org_plan_recompute on public.organizations;
create trigger org_plan_recompute after update of plan_id on public.organizations
  for each row execute function public.trg_org_plan_recompute();

-- Lecture (remplace la résolution plan_id de useFeatureFlag) : features actives de MON org
-- (D1-b A : org du caller, pas le superviseur ; iso-comportement portail).
create or replace function public.my_features()
returns table (slug text, source text)
language sql stable security definer set search_path = public as $$
  select substring(e.key from 9) as slug,
         case when e.source like 'plan%' then 'plan' else 'override' end as source
  from public.org_entitlements e
  where e.organization_id = public.get_my_organization_id()
    and e.key like 'feature.%'
    and (e.status = 'active'
         or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())));
$$;
revoke all on function public.my_features() from public;
grant execute on function public.my_features() to authenticated;
