-- Migration: Fix recursion sur mission_members (UP)

-- Fonction SECURITY DEFINER pour recuperer les mission_ids de l'utilisateur courant
create or replace function public.get_my_mission_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select mission_id
  from public.mission_members
  where user_id = public.get_my_user_id();
$$;

comment on function public.get_my_mission_ids() is 'SECURITY DEFINER — retourne les mission_ids du user courant sans declencher les policies RLS sur mission_members';

-- Remplacer la policy recursive sur mission_members
drop policy if exists "mission_members_select_team" on public.mission_members;
create policy "mission_members_select_team"
  on public.mission_members for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

-- Simplifier aussi les autres policies qui utilisent mission_members en sous-requete

drop policy if exists "mca_select_team" on public.mission_control_assignments;
create policy "mca_select_team"
  on public.mission_control_assignments for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "missions_select_team" on public.missions;
create policy "missions_select_team"
  on public.missions for select
  to authenticated
  using (id in (select public.get_my_mission_ids()));

drop policy if exists "ca_select_lead_associate" on public.control_assessments;
create policy "ca_select_lead_associate"
  on public.control_assessments for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "av_select_mission_team" on public.assessment_validations;
create policy "av_select_mission_team"
  on public.assessment_validations for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      where ca.id = assessment_validations.assessment_id
        and ca.mission_id in (select public.get_my_mission_ids())
    )
  );

drop policy if exists "qi_select_mission_team" on public.questionnaire_instances;
create policy "qi_select_mission_team"
  on public.questionnaire_instances for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "qr_select_team" on public.questionnaire_responses;
create policy "qr_select_team"
  on public.questionnaire_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.questionnaire_instances qi
      where qi.id = questionnaire_responses.instance_id
        and qi.mission_id in (select public.get_my_mission_ids())
    )
  );

drop policy if exists "documents_select_team" on public.documents;
create policy "documents_select_team"
  on public.documents for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "documents_insert_team" on public.documents;
create policy "documents_insert_team"
  on public.documents for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "comments_select_team" on public.comments;
create policy "comments_select_team"
  on public.comments for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "comments_insert_team" on public.comments;
create policy "comments_insert_team"
  on public.comments for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "reports_select_team" on public.reports;
create policy "reports_select_team"
  on public.reports for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));
