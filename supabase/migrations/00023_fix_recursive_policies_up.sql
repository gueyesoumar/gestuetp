-- Migration: Correction des policies RLS recursives (UP)
-- Remplace les sous-requetes sur public.users par les fonctions SECURITY DEFINER

-- ============================================================
-- 1. public.users — policy recursive
-- ============================================================

drop policy if exists "users_select_same_org" on public.users;
create policy "users_select_same_org"
  on public.users for select
  to authenticated
  using (organization_id = public.get_my_organization_id());

-- users_select_self reste inchangee (pas de recursion, utilise auth.uid() directement)
-- users_update_self reste inchangee

-- ============================================================
-- 2. public.organizations — policy update
-- ============================================================

drop policy if exists "organizations_update_members" on public.organizations;
create policy "organizations_update_members"
  on public.organizations for update
  to authenticated
  using (id = public.get_my_organization_id())
  with check (id = public.get_my_organization_id());

-- ============================================================
-- 3. public.tenant_configs — policy update
-- ============================================================

drop policy if exists "tenant_configs_update_members" on public.tenant_configs;
create policy "tenant_configs_update_members"
  on public.tenant_configs for update
  to authenticated
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id());

-- ============================================================
-- 4. public.platform_roles — policy select
-- ============================================================

drop policy if exists "platform_roles_select_org_members" on public.platform_roles;
create policy "platform_roles_select_org_members"
  on public.platform_roles for select
  to authenticated
  using (organization_id = public.get_my_organization_id());

-- ============================================================
-- 5. public.user_platform_roles — policies select
-- ============================================================

drop policy if exists "user_platform_roles_select_self" on public.user_platform_roles;
create policy "user_platform_roles_select_self"
  on public.user_platform_roles for select
  to authenticated
  using (user_id = public.get_my_user_id());

drop policy if exists "user_platform_roles_select_same_org" on public.user_platform_roles;
create policy "user_platform_roles_select_same_org"
  on public.user_platform_roles for select
  to authenticated
  using (
    exists (
      select 1 from public.users target
      where target.id = user_platform_roles.user_id
        and target.organization_id = public.get_my_organization_id()
    )
  );

-- ============================================================
-- 6. public.missions — policies select et update
-- ============================================================

drop policy if exists "missions_select_cabinet" on public.missions;
create policy "missions_select_cabinet"
  on public.missions for select
  to authenticated
  using (cabinet_id = public.get_my_organization_id());

drop policy if exists "missions_select_client" on public.missions;
create policy "missions_select_client"
  on public.missions for select
  to authenticated
  using (client_id = public.get_my_organization_id());

drop policy if exists "missions_select_team" on public.missions;
create policy "missions_select_team"
  on public.missions for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = missions.id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "missions_update_lead_associate" on public.missions;
create policy "missions_update_lead_associate"
  on public.missions for update
  to authenticated
  using (
    lead_auditor_id = public.get_my_user_id()
    or associate_id = public.get_my_user_id()
  )
  with check (
    lead_auditor_id = public.get_my_user_id()
    or associate_id = public.get_my_user_id()
  );

-- ============================================================
-- 7. public.mission_members — policies select
-- ============================================================

drop policy if exists "mission_members_select_team" on public.mission_members;
create policy "mission_members_select_team"
  on public.mission_members for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = mission_members.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "mission_members_select_cabinet" on public.mission_members;
create policy "mission_members_select_cabinet"
  on public.mission_members for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_members.mission_id
        and m.cabinet_id = public.get_my_organization_id()
    )
  );

-- ============================================================
-- 8. public.mission_control_assignments
-- ============================================================

drop policy if exists "mca_select_team" on public.mission_control_assignments;
create policy "mca_select_team"
  on public.mission_control_assignments for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = mission_control_assignments.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

-- ============================================================
-- 9. public.control_assessments
-- ============================================================

drop policy if exists "ca_select_auditor" on public.control_assessments;
create policy "ca_select_auditor"
  on public.control_assessments for select
  to authenticated
  using (auditor_id = public.get_my_user_id());

drop policy if exists "ca_update_auditor" on public.control_assessments;
create policy "ca_update_auditor"
  on public.control_assessments for update
  to authenticated
  using (
    auditor_id = public.get_my_user_id()
    and status in ('draft', 'rejected')
  )
  with check (auditor_id = public.get_my_user_id());

drop policy if exists "ca_select_lead_associate" on public.control_assessments;
create policy "ca_select_lead_associate"
  on public.control_assessments for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = control_assessments.mission_id
        and (m.lead_auditor_id = public.get_my_user_id() or m.associate_id = public.get_my_user_id())
    )
  );

drop policy if exists "ca_select_client" on public.control_assessments;
create policy "ca_select_client"
  on public.control_assessments for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = control_assessments.mission_id
        and m.client_id = public.get_my_organization_id()
        and control_assessments.status in ('approved', 'in_review')
    )
  );

-- ============================================================
-- 10. public.assessment_validations
-- ============================================================

drop policy if exists "av_select_mission_team" on public.assessment_validations;
create policy "av_select_mission_team"
  on public.assessment_validations for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.mission_members mm on mm.mission_id = ca.mission_id
      where ca.id = assessment_validations.assessment_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "av_select_client" on public.assessment_validations;
create policy "av_select_client"
  on public.assessment_validations for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      where ca.id = assessment_validations.assessment_id
        and m.client_id = public.get_my_organization_id()
    )
  );

-- ============================================================
-- 11. public.questionnaire_instances
-- ============================================================

drop policy if exists "qi_select_mission_team" on public.questionnaire_instances;
create policy "qi_select_mission_team"
  on public.questionnaire_instances for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = questionnaire_instances.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "qi_select_client" on public.questionnaire_instances;
create policy "qi_select_client"
  on public.questionnaire_instances for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = questionnaire_instances.mission_id
        and m.client_id = public.get_my_organization_id()
    )
  );

-- ============================================================
-- 12. public.questionnaire_responses
-- ============================================================

drop policy if exists "qr_select_client" on public.questionnaire_responses;
create policy "qr_select_client"
  on public.questionnaire_responses for select
  to authenticated
  using (
    responded_by = public.get_my_user_id()
    or exists (
      select 1 from public.questionnaire_instances qi
      join public.missions m on m.id = qi.mission_id
      where qi.id = questionnaire_responses.instance_id
        and m.client_id = public.get_my_organization_id()
    )
  );

drop policy if exists "qr_insert_client" on public.questionnaire_responses;
create policy "qr_insert_client"
  on public.questionnaire_responses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.questionnaire_instances qi
      join public.missions m on m.id = qi.mission_id
      where qi.id = questionnaire_responses.instance_id
        and m.client_id = public.get_my_organization_id()
    )
  );

drop policy if exists "qr_update_client" on public.questionnaire_responses;
create policy "qr_update_client"
  on public.questionnaire_responses for update
  to authenticated
  using (responded_by = public.get_my_user_id())
  with check (responded_by = public.get_my_user_id());

drop policy if exists "qr_select_team" on public.questionnaire_responses;
create policy "qr_select_team"
  on public.questionnaire_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.questionnaire_instances qi
      join public.mission_members mm on mm.mission_id = qi.mission_id
      where qi.id = questionnaire_responses.instance_id
        and mm.user_id = public.get_my_user_id()
    )
  );

-- ============================================================
-- 13. public.documents
-- ============================================================

drop policy if exists "documents_select_team" on public.documents;
create policy "documents_select_team"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = documents.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "documents_select_client" on public.documents;
create policy "documents_select_client"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = documents.mission_id
        and m.client_id = public.get_my_organization_id()
    )
  );

drop policy if exists "documents_insert_client" on public.documents;
create policy "documents_insert_client"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.missions m
      where m.id = documents.mission_id
        and m.client_id = public.get_my_organization_id()
    )
  );

drop policy if exists "documents_insert_team" on public.documents;
create policy "documents_insert_team"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = documents.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

-- ============================================================
-- 14. public.comments
-- ============================================================

drop policy if exists "comments_select_team" on public.comments;
create policy "comments_select_team"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = comments.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "comments_insert_team" on public.comments;
create policy "comments_insert_team"
  on public.comments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = comments.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "comments_select_client" on public.comments;
create policy "comments_select_client"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = comments.mission_id
        and m.client_id = public.get_my_organization_id()
    )
  );

drop policy if exists "comments_insert_client" on public.comments;
create policy "comments_insert_client"
  on public.comments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.missions m
      where m.id = comments.mission_id
        and m.client_id = public.get_my_organization_id()
    )
  );

drop policy if exists "comments_update_author" on public.comments;
create policy "comments_update_author"
  on public.comments for update
  to authenticated
  using (author_id = public.get_my_user_id())
  with check (author_id = public.get_my_user_id());

-- ============================================================
-- 15. public.reports
-- ============================================================

drop policy if exists "reports_select_team" on public.reports;
create policy "reports_select_team"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      where mm.mission_id = reports.mission_id
        and mm.user_id = public.get_my_user_id()
    )
  );

drop policy if exists "reports_select_client" on public.reports;
create policy "reports_select_client"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = reports.mission_id
        and m.client_id = public.get_my_organization_id()
        and reports.status = 'ready'
    )
  );
