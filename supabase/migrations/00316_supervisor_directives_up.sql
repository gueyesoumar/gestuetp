-- 00316 - Gëstu Risk / RFC 0017 Lot 6c : directives de traitement du superviseur.
-- Canal d'écriture CROSS-TENANT contrôlé : le régulateur crée/vérifie des actions de
-- traitement sur le registre d'un assujetti. La RLS de risk_treatment_actions reste
-- strictement org-scoped ; l'écriture cross-org passe UNIQUEMENT par ces RPC
-- SECURITY DEFINER qui vérifient la relation de supervision (mission active :
-- cabinet=régulateur, membre, client=assujetti). Aucune table nouvelle (colonnes Lot 2).

-- Relation de supervision (même autorité que get_audited_org_risks).
create or replace function public.can_supervise_org(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_aal2()
     and not public.is_client_role()
     and exists (
       select 1
       from public.missions m
       join public.mission_members mm on mm.mission_id = m.id
       where m.cabinet_id = public.get_my_organization_id()
         and mm.user_id = public.get_my_user_id()
         and m.is_active = true
         and m.client_id = p_org
     );
$$;

revoke all on function public.can_supervise_org(uuid) from public;
grant execute on function public.can_supervise_org(uuid) to authenticated;

-- Créer une directive (action de traitement) sur un scénario d'un assujetti supervisé.
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

  -- Journalisation explicite dans la chaîne de l'ASSUJETTI (le trigger générique
  -- journalise déjà côté régulateur = acteur).
  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_label from public.users where id = public.get_my_user_id();
  insert into public.activity_log
    (organization_id, actor_user_id, actor_label, action, target_type, target_id, target_label, source)
  values
    (v_org, public.get_my_user_id(), v_label, 'risk.directive.requested', 'risk_treatment', v_id, left(p_description, 120), 'system');

  return v_id;
end $$;

revoke all on function public.request_risk_treatment(uuid, text, uuid, date) from public;
grant execute on function public.request_risk_treatment(uuid, text, uuid, date) to authenticated;

-- Vérifier (ou rejeter) la clôture d'une directive.
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

revoke all on function public.verify_risk_treatment(uuid, text) from public;
grant execute on function public.verify_risk_treatment(uuid, text) to authenticated;

-- Worklist : les directives émises par le régulateur courant (cross-tenant, lecture).
create or replace function public.get_supervisor_directives()
returns table (
  id uuid, organization_id uuid, org_name text, risk_scenario_id uuid, scenario_title text,
  description text, due_date date, status text, verification_status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.organization_id, o.name, a.risk_scenario_id, rs.title,
         a.description, a.due_date, a.status, a.verification_status, a.created_at
  from public.risk_treatment_actions a
  join public.organizations o on o.id = a.organization_id
  left join public.risk_scenarios rs on rs.id = a.risk_scenario_id
  where a.origin = 'supervisor_directive'
    and a.requested_by = public.get_my_user_id()
    and public.is_aal2() and not public.is_client_role()
  order by a.due_date asc nulls last, a.created_at desc;
$$;

revoke all on function public.get_supervisor_directives() from public;
grant execute on function public.get_supervisor_directives() to authenticated;
