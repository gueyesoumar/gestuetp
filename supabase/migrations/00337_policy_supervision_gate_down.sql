-- Migration 00337 (DOWN) : retire le cablage POLICY + SUPERVISION (retour etat 00336).

drop trigger if exists trg_cap_policies on public.policies;
drop trigger if exists trg_cap_policy_versions on public.policy_versions;
drop trigger if exists trg_cap_policy_control_links on public.policy_control_links;
drop trigger if exists trg_cap_policy_risk_links on public.policy_risk_links;
drop trigger if exists trg_cap_policy_effectiveness on public.policy_effectiveness_attestations;

-- Restaure les 2 RPC supervision a la version 00316 (sans garde d'entitlement).
create or replace function public.request_risk_treatment(
  p_scenario uuid, p_description text, p_control_id uuid default null, p_due_date date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid; v_label text;
begin
  if coalesce(btrim(p_description), '') = '' then raise exception 'Description requise'; end if;
  select organization_id into v_org from public.risk_scenarios where id = p_scenario;
  if v_org is null then raise exception 'Scenario introuvable'; end if;
  if not public.can_supervise_org(v_org) then raise exception 'Non autorise : aucune relation de supervision active.'; end if;

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

-- Restaure gate_coverage_audit a la version 00336 (branches measures + risk).
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
  end if;
  return;
end $$;
