-- 00328 - Gëstu Risk : boucle portail assujetti pour les directives du régulateur.
--
-- Une directive = risk_treatment_actions (origin='supervisor_directive') insérée dans
-- l'org de l'ASSUJETTI. Jusqu'ici invisible pour un assujetti portail-only (RLS
-- rta_org exclut les clients). On ouvre une voie CLIENT strictement scopée à sa propre
-- org, pour voir la directive, y répondre (statut + note) et joindre une preuve.
-- Le régulateur voit la réponse + les preuves via les RPC SECURITY DEFINER existants.

-- -- 1. Helper : org(s) propre(s) de l'assujetti portail (pas le cabinet qui sert) ----
create or replace function public.get_my_portal_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select cc.client_org_id
  from public.cabinet_clients cc
  join public.client_portal_contacts cpc on cpc.cabinet_client_id = cc.id
  where cpc.user_id = public.get_my_user_id();
$$;
revoke all on function public.get_my_portal_org_ids() from public;
grant execute on function public.get_my_portal_org_ids() to authenticated;

-- -- 2. Réponse de l'assujetti sur la directive --------------------------------------
alter table public.risk_treatment_actions
  add column if not exists client_response text,
  add column if not exists client_responded_at timestamptz;

-- Lecture client : uniquement les DIRECTIVES de sa propre org.
drop policy if exists "cp_rta_select" on public.risk_treatment_actions;
create policy "cp_rta_select" on public.risk_treatment_actions for select to authenticated
using (
  public.is_client_role()
  and origin = 'supervisor_directive'
  and organization_id in (select public.get_my_portal_org_ids())
);

-- Réponse (statut + note) via RPC : verrouille les colonnes modifiables, ne touche
-- JAMAIS verification_status (réservé au régulateur). Rejouable tant que non vérifié.
create or replace function public.respond_risk_directive(p_action uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if p_status not in ('in_progress', 'done') then raise exception 'invalid status'; end if;
  select organization_id into v_org from public.risk_treatment_actions
    where id = p_action and origin = 'supervisor_directive';
  if v_org is null then raise exception 'not found'; end if;
  if not public.is_client_role() or v_org not in (select public.get_my_portal_org_ids()) then
    raise exception 'not authorized';
  end if;
  update public.risk_treatment_actions
    set status = p_status, client_response = p_note, client_responded_at = now(), updated_at = now()
  where id = p_action and verification_status in ('pending', 'rejected');
end;
$$;
revoke all on function public.respond_risk_directive(uuid, text, text) from public;
grant execute on function public.respond_risk_directive(uuid, text, text) to authenticated;

-- -- 3. Preuves jointes à une directive ----------------------------------------------
create table if not exists public.risk_directive_evidence (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.risk_treatment_actions(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rde_action on public.risk_directive_evidence(action_id);
alter table public.risk_directive_evidence enable row level security;
-- Aucune policy authenticated : accès UNIQUEMENT via les RPC SECURITY DEFINER ci-dessous.

-- Le client (sa propre org) enregistre une preuve après upload storage.
create or replace function public.add_directive_evidence(p_action uuid, p_path text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select organization_id into v_org from public.risk_treatment_actions
    where id = p_action and origin = 'supervisor_directive';
  if v_org is null then raise exception 'not found'; end if;
  if not public.is_client_role() or v_org not in (select public.get_my_portal_org_ids()) then
    raise exception 'not authorized';
  end if;
  insert into public.risk_directive_evidence (action_id, file_path, file_name, uploaded_by)
  values (p_action, p_path, p_name, public.get_my_user_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_directive_evidence(uuid, text, text) from public;
grant execute on function public.add_directive_evidence(uuid, text, text) to authenticated;

-- Lecture des preuves : assujetti (sa propre org) OU régulateur superviseur.
create or replace function public.get_directive_evidence(p_action uuid)
returns table (id uuid, file_path text, file_name text, uploaded_by uuid, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.file_path, e.file_name, e.uploaded_by, e.created_at
  from public.risk_directive_evidence e
  join public.risk_treatment_actions a on a.id = e.action_id
  where e.action_id = p_action
    and (
      (public.is_client_role() and a.organization_id in (select public.get_my_portal_org_ids()))
      or public.can_supervise_org(a.organization_id)
    )
  order by e.created_at;
$$;
revoke all on function public.get_directive_evidence(uuid) from public;
grant execute on function public.get_directive_evidence(uuid) to authenticated;

-- -- 4. Accès storage : préfixe risk-directives/<actionId> dans le bucket documents --
create or replace function public.can_access_risk_directive_file(p_action_text text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid; v_org uuid;
begin
  begin v_id := p_action_text::uuid; exception when others then return false; end;
  select organization_id into v_org from public.risk_treatment_actions where id = v_id;
  if v_org is null then return false; end if;
  return (public.is_client_role() and v_org in (select public.get_my_portal_org_ids()))
         or public.can_supervise_org(v_org);
end;
$$;
revoke all on function public.can_access_risk_directive_file(text) from public;
grant execute on function public.can_access_risk_directive_file(text) to authenticated;

-- Étend can_access_document_object (bucket documents) : ajoute le préfixe risk-directives.
create or replace function public.can_access_document_object(object_name text)
returns boolean language sql stable set search_path = public as $$
  select (
    (storage.foldername(object_name))[1] = 'missions'
    and (
      exists (select 1 from public.get_my_mission_ids() gm where gm::text = (storage.foldername(object_name))[2])
      or exists (select 1 from public.get_my_client_mission_ids() cm where cm::text = (storage.foldername(object_name))[2])
      or public.is_platform_owner()
    )
  ) or (
    (storage.foldername(object_name))[1] = 'risk-directives'
    and public.can_access_risk_directive_file((storage.foldername(object_name))[2])
  );
$$;

-- -- 5. Worklist régulateur : expose la réponse du client + le nombre de preuves ----
drop function if exists public.get_supervisor_directives();
create or replace function public.get_supervisor_directives()
returns table (
  id uuid, organization_id uuid, org_name text, risk_scenario_id uuid, scenario_title text,
  description text, due_date date, status text, verification_status text, created_at timestamptz,
  client_response text, client_responded_at timestamptz, evidence_count int)
language sql stable security definer set search_path = '' as $$
  select a.id, a.organization_id, o.name, a.risk_scenario_id, rs.title,
         a.description, a.due_date, a.status, a.verification_status, a.created_at,
         a.client_response, a.client_responded_at,
         (select count(*)::int from public.risk_directive_evidence e where e.action_id = a.id)
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
