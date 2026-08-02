-- Migration 00163 (UP) : bascule VAGUE 1 des policies staff-sortant vers visible_target_ids (RFC 0001 §9, P3a).
--
-- Prérequis : 00162 (visible_target_ids) appliquée + équivalence VÉRIFIÉE (0/0 sur
-- les 2 instances : le jeu d'arêtes graphe == le jeu parent_org_id actif).
--
-- Chaque policy : SEUL le sous-scope change —
--   `get_subsidiary_ids(get_my_organization_id())` -> `visible_target_ids()`.
-- Tout le reste (colonnes, gardes is_client_role, EXISTS) est IDENTIQUE.
-- Comportement préservé (équivalence prouvée). RLS -> tester avec compte non-admin.
--
-- Périmètre vague 1 : les policies dont le sous-arbre régulateur/groupe est l'UNIQUE
-- scope (regulatory_measures, incidents, entity_regulatory_profile, supervision
-- groupe sur missions/control_assessments/CAR). Les chemins portail (cp_*,
-- get_my_entity_org_ids) et probative_log restent sur leurs helpers -> vagues suivantes.

-- 1. regulatory_measures ------------------------------------------------------
drop policy if exists "rm_select_regulator" on public.regulatory_measures;
create policy "rm_select_regulator"
  on public.regulatory_measures for select to authenticated
  using (
    not public.is_client_role()
    and entity_id in (select public.visible_target_ids())
  );

-- 2. incidents ----------------------------------------------------------------
drop policy if exists "inc_select_regulator" on public.incidents;
create policy "inc_select_regulator"
  on public.incidents for select to authenticated
  using (
    not public.is_client_role()
    and entity_id in (select public.visible_target_ids())
  );

-- 3. entity_regulatory_profile ------------------------------------------------
drop policy if exists "erp_select_regulator" on public.entity_regulatory_profile;
create policy "erp_select_regulator"
  on public.entity_regulatory_profile for select to authenticated
  using (
    not public.is_client_role()
    and organization_id in (select public.visible_target_ids())
  );

-- 4. missions (supervision groupe) --------------------------------------------
drop policy if exists "missions_select_group" on public.missions;
create policy "missions_select_group"
  on public.missions for select to authenticated
  using (
    client_id in (select public.visible_target_ids())
  );

-- 5. control_assessments (supervision groupe) ---------------------------------
drop policy if exists "ca_select_group" on public.control_assessments;
create policy "ca_select_group"
  on public.control_assessments for select to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = control_assessments.mission_id
        and m.client_id in (select public.visible_target_ids())
    )
  );

-- 6. corrective_action_requests (supervision groupe) --------------------------
drop policy if exists "car_select_group" on public.corrective_action_requests;
create policy "car_select_group"
  on public.corrective_action_requests for select to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = corrective_action_requests.mission_id
        and m.client_id in (select public.visible_target_ids())
    )
  );
