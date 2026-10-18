-- Migration 00337 (UP) : cablage POLICY + SUPERVISION, RFC 0018 Phase 5-b.
-- DEPLOYE EN SOFT (inerte tant que les cles ne sont pas en 'hard').
-- Reutilise la garde unifiee de 00336 (_capability_write_allowed + trigger
-- enforce_capability_write). Incidents = cote edge (declare-incident).

-- 1. POLICY (cle 'policy') : trigger sur les tables d'ecriture de politiques.
--    policy_acknowledgements = acquittement self-scope cote lecteur -> NON garde.
drop trigger if exists trg_cap_policies on public.policies;
create trigger trg_cap_policies before insert or update on public.policies
  for each row execute function public.enforce_capability_write('policy');

drop trigger if exists trg_cap_policy_versions on public.policy_versions;
create trigger trg_cap_policy_versions before insert or update on public.policy_versions
  for each row execute function public.enforce_capability_write('policy');

drop trigger if exists trg_cap_policy_control_links on public.policy_control_links;
create trigger trg_cap_policy_control_links before insert or update on public.policy_control_links
  for each row execute function public.enforce_capability_write('policy');

drop trigger if exists trg_cap_policy_risk_links on public.policy_risk_links;
create trigger trg_cap_policy_risk_links before insert or update on public.policy_risk_links
  for each row execute function public.enforce_capability_write('policy');

drop trigger if exists trg_cap_policy_effectiveness on public.policy_effectiveness_attestations;
create trigger trg_cap_policy_effectiveness before insert or update on public.policy_effectiveness_attestations
  for each row execute function public.enforce_capability_write('policy');

-- 2. SUPERVISION (cle 'supervision') : garde interne dans les RPC cross-tenant du
--    REGULATEUR. L'org verifiee est celle du CALLER (regulateur), pas celle de la
--    ligne (= assujetti). Le cote assujetti (respond_risk_directive /
--    add_directive_evidence) n'est JAMAIS garde par cette capacite.
--    Corps repris verbatim de 00316 + la garde d'entitlement.
create or replace function public.request_risk_treatment(
  p_scenario uuid, p_description text, p_control_id uuid default null, p_due_date date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid; v_label text;
begin
  if coalesce(btrim(p_description), '') = '' then raise exception 'Description requise'; end if;
  select organization_id into v_org from public.risk_scenarios where id = p_scenario;
  if v_org is null then raise exception 'Scenario introuvable'; end if;
  if not public.can_supervise_org(v_org) then raise exception 'Non autorise : aucune relation de supervision active.'; end if;
  if not public._capability_write_allowed(public.get_my_organization_id(), 'supervision') then
    raise exception 'Module supervision non inclus dans votre offre.' using errcode = 'P0001';
  end if;

  insert into public.risk_treatment_actions
    (organization_id, risk_scenario_id, description, control_id, due_date, origin, requested_by, created_by)
  values
    (v_org, p_scenario, p_description, p_control_id, p_due_date, 'supervisor_directive',
     public.get_my_user_id(), public.get_my_user_id())
  returning id into v_id;

  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_label from public.users where id = public.get_my_user_id();
  insert into public.activity_log
    (organization_id, actor_user_id, actor_label, action, target_type, target_id, target_label, source)
  values
    (v_org, public.get_my_user_id(), v_label, 'risk.directive.requested', 'risk_treatment', v_id, left(p_description, 120), 'system');

  return v_id;
end $$;

create or replace function public.verify_risk_treatment(p_action uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_label text;
begin
  if p_decision not in ('verified', 'rejected') then raise exception 'Decision invalide'; end if;
  select organization_id into v_org from public.risk_treatment_actions
    where id = p_action and origin = 'supervisor_directive';
  if v_org is null then raise exception 'Directive introuvable'; end if;
  if not public.can_supervise_org(v_org) then raise exception 'Non autorise.'; end if;
  if not public._capability_write_allowed(public.get_my_organization_id(), 'supervision') then
    raise exception 'Module supervision non inclus dans votre offre.' using errcode = 'P0001';
  end if;

  update public.risk_treatment_actions
    set verification_status = p_decision, verified_by = public.get_my_user_id(),
        verified_at = now(), updated_at = now()
  where id = p_action;

  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_label from public.users where id = public.get_my_user_id();
  insert into public.activity_log
    (organization_id, actor_user_id, actor_label, action, target_type, target_id, source)
  values
    (v_org, public.get_my_user_id(), v_label, 'risk.directive.' || p_decision, 'risk_treatment', p_action, 'system');
end $$;

-- 3. Pre-vol : brancher policy / supervision / incidents (garder measures + risk).
create or replace function public.gate_coverage_audit(p_key text)
returns table(organization_id uuid, org_name text, usage_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_key = 'measures' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.regulatory_measures m
      join public.users u on u.id = m.issued_by
      join public.organizations o on o.id = u.organization_id
      where not exists (select 1 from public.org_entitlements e where e.organization_id = o.id
        and (e.key = 'measures' or e.capability::text = 'measures')
        and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now()))))
      group by o.id, o.name;
  elsif p_key = 'risk' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.risk_scenarios rs
      join public.organizations o on o.id = rs.organization_id
      where not exists (select 1 from public.org_entitlements e where e.organization_id = o.id
        and (e.key = 'risk' or e.capability::text = 'risk')
        and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now()))))
      group by o.id, o.name;
  elsif p_key = 'policy' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.policies p
      join public.organizations o on o.id = p.organization_id
      where not exists (select 1 from public.org_entitlements e where e.organization_id = o.id
        and (e.key = 'policy' or e.capability::text = 'policy')
        and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now()))))
      group by o.id, o.name;
  elsif p_key = 'supervision' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.risk_treatment_actions a
      join public.users u on u.id = a.requested_by
      join public.organizations o on o.id = u.organization_id
      where a.origin = 'supervisor_directive'
        and not exists (select 1 from public.org_entitlements e where e.organization_id = o.id
          and (e.key = 'supervision' or e.capability::text = 'supervision')
          and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now()))))
      group by o.id, o.name;
  elsif p_key = 'incidents' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.incidents i
      join public.users u on u.id = i.declared_by
      join public.organizations o on o.id = u.organization_id
      where u.role <> 'client'
        and not exists (select 1 from public.org_entitlements e where e.organization_id = o.id
          and (e.key = 'incidents' or e.capability::text = 'incidents')
          and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now()))))
      group by o.id, o.name;
  end if;
  return;
end $$;
comment on function public.gate_coverage_audit(text) is
  'RFC 0018 P5 pre-vol : orgs utilisant deja une fonctionnalite sans en avoir le droit. 0 ligne = activation sure. Branches : measures, risk, policy, supervision, incidents.';
