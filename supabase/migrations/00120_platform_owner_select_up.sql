-- Migration 00120: Platform owner SELECT global (UP)
-- Description: Donne au platform_owner (super-admin Gestu) la lecture de toutes
-- les tables mission-scoped et organization-scoped. Sans cette policy, le panneau
-- /admin/cabinets/:id retourne 0 missions / membres / etc. quand on consulte une
-- organisation à laquelle on n'appartient pas.
--
-- Pattern : SELECT-only, jamais d'écriture. Les opérations admin destructives
-- passent par les Edge Functions service-role + audit log.
--
-- Idempotent : DROP IF EXISTS + CREATE pour pouvoir réappliquer sans erreur.

-- ════════════════════════════════════════════════════════════════════════════
-- Mission-scoped tables
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "missions_select_platform_owner" ON public.missions;
CREATE POLICY "missions_select_platform_owner"
  ON public.missions FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "mission_members_select_platform_owner" ON public.mission_members;
CREATE POLICY "mission_members_select_platform_owner"
  ON public.mission_members FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "mca_select_platform_owner" ON public.mission_control_assignments;
CREATE POLICY "mca_select_platform_owner"
  ON public.mission_control_assignments FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "ca_select_platform_owner" ON public.control_assessments;
CREATE POLICY "ca_select_platform_owner"
  ON public.control_assessments FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "av_select_platform_owner" ON public.assessment_validations;
CREATE POLICY "av_select_platform_owner"
  ON public.assessment_validations FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "af_select_platform_owner" ON public.assessment_findings;
CREATE POLICY "af_select_platform_owner"
  ON public.assessment_findings FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "qi_select_platform_owner" ON public.questionnaire_instances;
CREATE POLICY "qi_select_platform_owner"
  ON public.questionnaire_instances FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "qr_select_platform_owner" ON public.questionnaire_responses;
CREATE POLICY "qr_select_platform_owner"
  ON public.questionnaire_responses FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "documents_select_platform_owner" ON public.documents;
CREATE POLICY "documents_select_platform_owner"
  ON public.documents FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "cp_select_platform_owner" ON public.control_planning;
CREATE POLICY "cp_select_platform_owner"
  ON public.control_planning FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "client_contacts_select_platform_owner" ON public.client_contacts;
CREATE POLICY "client_contacts_select_platform_owner"
  ON public.client_contacts FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "interview_schedules_select_platform_owner" ON public.interview_schedules;
CREATE POLICY "interview_schedules_select_platform_owner"
  ON public.interview_schedules FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "interview_topics_select_platform_owner" ON public.interview_topics;
CREATE POLICY "interview_topics_select_platform_owner"
  ON public.interview_topics FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "interview_actors_select_platform_owner" ON public.interview_actors;
CREATE POLICY "interview_actors_select_platform_owner"
  ON public.interview_actors FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "mr_select_platform_owner" ON public.mission_risks;
CREATE POLICY "mr_select_platform_owner"
  ON public.mission_risks FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "control_comments_select_platform_owner" ON public.control_comments;
CREATE POLICY "control_comments_select_platform_owner"
  ON public.control_comments FOR SELECT TO authenticated
  USING (public.is_platform_owner());

-- ════════════════════════════════════════════════════════════════════════════
-- Cabinet/Organization-scoped tables
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "cabinet_clients_select_platform_owner" ON public.cabinet_clients;
CREATE POLICY "cabinet_clients_select_platform_owner"
  ON public.cabinet_clients FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "client_portal_contacts_select_platform_owner" ON public.client_portal_contacts;
CREATE POLICY "client_portal_contacts_select_platform_owner"
  ON public.client_portal_contacts FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "client_mission_access_select_platform_owner" ON public.client_mission_access;
CREATE POLICY "client_mission_access_select_platform_owner"
  ON public.client_mission_access FOR SELECT TO authenticated
  USING (public.is_platform_owner());

DROP POLICY IF EXISTS "client_action_items_select_platform_owner" ON public.client_action_items;
CREATE POLICY "client_action_items_select_platform_owner"
  ON public.client_action_items FOR SELECT TO authenticated
  USING (public.is_platform_owner());

-- ════════════════════════════════════════════════════════════════════════════
-- Catalog-scoped (déjà accessibles à tout authenticated en lecture, mais on
-- garde la cohérence pour les liens transverses)
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "question_controls_select_platform_owner" ON public.question_controls;
CREATE POLICY "question_controls_select_platform_owner"
  ON public.question_controls FOR SELECT TO authenticated
  USING (public.is_platform_owner());
