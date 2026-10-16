-- 00328 (DOWN) - retrait de la boucle portail assujetti.

-- Restaure can_access_document_object (sans le préfixe risk-directives).
create or replace function public.can_access_document_object(object_name text)
returns boolean language sql stable set search_path = public as $$
  select (storage.foldername(object_name))[1] = 'missions'
     and (
          exists (select 1 from public.get_my_mission_ids() gm
                  where gm::text = (storage.foldername(object_name))[2])
       or exists (select 1 from public.get_my_client_mission_ids() cm
                  where cm::text = (storage.foldername(object_name))[2])
       or public.is_platform_owner()
     );
$$;

-- Restaure get_supervisor_directives (état 00316).
drop function if exists public.get_supervisor_directives();
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

drop function if exists public.get_directive_evidence(uuid);
drop function if exists public.add_directive_evidence(uuid, text, text);
drop function if exists public.can_access_risk_directive_file(text);
drop table if exists public.risk_directive_evidence;
drop function if exists public.respond_risk_directive(uuid, text, text);
drop policy if exists "cp_rta_select" on public.risk_treatment_actions;
alter table public.risk_treatment_actions
  drop column if exists client_response,
  drop column if exists client_responded_at;
drop function if exists public.get_my_portal_org_ids();
