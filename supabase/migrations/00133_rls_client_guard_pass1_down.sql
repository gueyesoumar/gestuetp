-- Rollback 00133 : restaure les policies SELECT staff d'origine (sans la garde
-- NOT is_client_role()). ATTENTION : réintroduit la fuite client (passe 1).

drop policy if exists "mission_members_select_team" on public.mission_members;
create policy "mission_members_select_team"
  on public.mission_members for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "mission_members_select_cabinet" on public.mission_members;
create policy "mission_members_select_cabinet"
  on public.mission_members for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.cabinet_id
      where m.id = mission_members.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

drop policy if exists "cabinet_clients_select_cabinet" on public.cabinet_clients;
create policy "cabinet_clients_select_cabinet"
  on public.cabinet_clients for select
  to authenticated
  using (cabinet_id = public.get_my_organization_id());

drop policy if exists "mr_select_team" on public.mission_risks;
create policy "mr_select_team"
  on public.mission_risks for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "me_select_team" on public.mission_exclusions;
create policy "me_select_team"
  on public.mission_exclusions for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "cp_select_team" on public.control_planning;
create policy "cp_select_team"
  on public.control_planning for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

drop policy if exists "ah_select_cabinet" on public.audit_history;
create policy "ah_select_cabinet"
  on public.audit_history for select
  to authenticated
  using (
    cabinet_client_id in (
      select id from public.cabinet_clients
      where cabinet_id = public.get_my_organization_id()
    )
  );

drop policy if exists "control_comments_select_members" on public.control_comments;
create policy "control_comments_select_members"
  on public.control_comments for select
  to authenticated
  using (
    deleted_at is null
    and mission_id in (select public.get_my_mission_ids())
  );

drop policy if exists "audit_topics_select" on public.audit_topics;
create policy "audit_topics_select"
  on public.audit_topics for select
  to authenticated
  using (
    framework_id is not null
    or mission_id in (select public.get_my_mission_ids())
  );

drop policy if exists "topic_controls_select" on public.topic_controls;
create policy "topic_controls_select"
  on public.topic_controls for select
  to authenticated
  using (
    topic_id in (
      select id from public.audit_topics
      where framework_id is not null
        or mission_id in (select public.get_my_mission_ids())
    )
  );
