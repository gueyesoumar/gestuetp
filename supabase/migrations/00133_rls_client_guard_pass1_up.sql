-- 00133 — Cloisonnement client (passe 1/2) : garde NOT is_client_role() sur les
-- policies SELECT « staff » des tables SANS accès client légitime.
--
-- Contexte : un user role=client a organization_id = l'org du cabinet, donc il
-- déclenche les policies staff (org/équipe) qui n'avaient pas de garde de rôle
-- -> il lisait mission_members, cabinet_clients, control_comments, etc. d'autres
-- missions. Le modèle cible : les policies cp_* (is_client_role + accès par
-- contact) sont le SEUL chemin client. Ici on exclut explicitement les clients
-- des policies staff. Aucun impact sur les auditeurs (role != client) ni sur le
-- platform owner (policies dédiées). is_client_role() est SECURITY DEFINER -> pas
-- de récursion. Passe 1 = tables où le client ne doit RIEN voir (zéro régression
-- d'accès légitime, aucune policy cp_* à ajouter).

-- mission_members --------------------------------------------------------------
drop policy if exists "mission_members_select_team" on public.mission_members;
create policy "mission_members_select_team"
  on public.mission_members for select
  to authenticated
  using (not public.is_client_role() and (mission_id in (select public.get_my_mission_ids())));

drop policy if exists "mission_members_select_cabinet" on public.mission_members;
create policy "mission_members_select_cabinet"
  on public.mission_members for select
  to authenticated
  using (
    not public.is_client_role()
    and exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.cabinet_id
      where m.id = mission_members.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- cabinet_clients --------------------------------------------------------------
drop policy if exists "cabinet_clients_select_cabinet" on public.cabinet_clients;
create policy "cabinet_clients_select_cabinet"
  on public.cabinet_clients for select
  to authenticated
  using (not public.is_client_role() and (cabinet_id = public.get_my_organization_id()));

-- mission_risks ----------------------------------------------------------------
drop policy if exists "mr_select_team" on public.mission_risks;
create policy "mr_select_team"
  on public.mission_risks for select
  to authenticated
  using (not public.is_client_role() and (mission_id in (select public.get_my_mission_ids())));

-- mission_exclusions -----------------------------------------------------------
drop policy if exists "me_select_team" on public.mission_exclusions;
create policy "me_select_team"
  on public.mission_exclusions for select
  to authenticated
  using (not public.is_client_role() and (mission_id in (select public.get_my_mission_ids())));

-- control_planning -------------------------------------------------------------
drop policy if exists "cp_select_team" on public.control_planning;
create policy "cp_select_team"
  on public.control_planning for select
  to authenticated
  using (not public.is_client_role() and (mission_id in (select public.get_my_mission_ids())));

-- audit_history ----------------------------------------------------------------
drop policy if exists "ah_select_cabinet" on public.audit_history;
create policy "ah_select_cabinet"
  on public.audit_history for select
  to authenticated
  using (
    not public.is_client_role()
    and cabinet_client_id in (
      select id from public.cabinet_clients
      where cabinet_id = public.get_my_organization_id()
    )
  );

-- control_comments -------------------------------------------------------------
drop policy if exists "control_comments_select_members" on public.control_comments;
create policy "control_comments_select_members"
  on public.control_comments for select
  to authenticated
  using (
    not public.is_client_role()
    and deleted_at is null
    and mission_id in (select public.get_my_mission_ids())
  );

-- audit_topics : on garde les templates de référentiel ouverts (framework_id),
-- on n'exclut le client que de la partie mission-scoped.
drop policy if exists "audit_topics_select" on public.audit_topics;
create policy "audit_topics_select"
  on public.audit_topics for select
  to authenticated
  using (
    framework_id is not null
    or (not public.is_client_role() and mission_id in (select public.get_my_mission_ids()))
  );

drop policy if exists "topic_controls_select" on public.topic_controls;
create policy "topic_controls_select"
  on public.topic_controls for select
  to authenticated
  using (
    topic_id in (
      select id from public.audit_topics
      where framework_id is not null
        or (not public.is_client_role() and mission_id in (select public.get_my_mission_ids()))
    )
  );
