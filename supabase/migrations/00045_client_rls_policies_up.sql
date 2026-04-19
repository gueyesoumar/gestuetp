-- Migration: client_rls_policies (UP)
-- Description: Policies RLS pour le portail client
-- IMPORTANT: préfixe "cp_" pour éviter conflit avec les policies existantes
-- Chaque policy est gardée par is_client_role() pour ne PAS impacter les auditeurs

-- ══════════════════════════════════════════════════════
-- MISSIONS — les clients portail peuvent voir leurs missions
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_missions_select" ON public.missions;
CREATE POLICY "cp_missions_select"
  ON public.missions FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND id IN (SELECT public.get_my_client_mission_ids())
  );

-- ══════════════════════════════════════════════════════
-- DOCUMENTS — les clients portail peuvent voir et déposer
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_documents_select" ON public.documents;
CREATE POLICY "cp_documents_select"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

DROP POLICY IF EXISTS "cp_documents_insert" ON public.documents;
CREATE POLICY "cp_documents_insert"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client_role()
    AND mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission = 'contributor'
    )
  );

-- ══════════════════════════════════════════════════════
-- CONTROL_ASSESSMENTS — les clients voient les évaluations
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_assessments_select" ON public.control_assessments;
CREATE POLICY "cp_assessments_select"
  ON public.control_assessments FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

-- ══════════════════════════════════════════════════════
-- ASSESSMENT_VALIDATIONS — les clients peuvent valider/contester
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_validations_select" ON public.assessment_validations;
CREATE POLICY "cp_validations_select"
  ON public.assessment_validations FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      WHERE ca.mission_id IN (SELECT public.get_my_client_mission_ids())
    )
  );

DROP POLICY IF EXISTS "cp_validations_insert" ON public.assessment_validations;
CREATE POLICY "cp_validations_insert"
  ON public.assessment_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client_role()
    AND assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      WHERE ca.mission_id IN (
        SELECT cma.mission_id FROM public.client_mission_access cma
        JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
        WHERE cpc.user_id = public.get_my_user_id()
          AND cma.permission = 'contributor'
      )
    )
  );

-- ══════════════════════════════════════════════════════
-- QUESTIONNAIRE_INSTANCES — les clients voient leurs questionnaires
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_qi_select" ON public.questionnaire_instances;
CREATE POLICY "cp_qi_select"
  ON public.questionnaire_instances FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

-- ══════════════════════════════════════════════════════
-- QUESTIONNAIRE_RESPONSES — les clients peuvent répondre
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_qr_select" ON public.questionnaire_responses;
CREATE POLICY "cp_qr_select"
  ON public.questionnaire_responses FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND instance_id IN (
      SELECT qi.id FROM public.questionnaire_instances qi
      WHERE qi.mission_id IN (SELECT public.get_my_client_mission_ids())
    )
  );

DROP POLICY IF EXISTS "cp_qr_insert" ON public.questionnaire_responses;
CREATE POLICY "cp_qr_insert"
  ON public.questionnaire_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client_role()
    AND instance_id IN (
      SELECT qi.id FROM public.questionnaire_instances qi
      WHERE qi.mission_id IN (
        SELECT cma.mission_id FROM public.client_mission_access cma
        JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
        WHERE cpc.user_id = public.get_my_user_id()
          AND cma.permission = 'contributor'
      )
    )
  );

-- ══════════════════════════════════════════════════════
-- INTERVIEW_SCHEDULES — les clients voient et confirment
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_interviews_select" ON public.interview_schedules;
CREATE POLICY "cp_interviews_select"
  ON public.interview_schedules FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

DROP POLICY IF EXISTS "cp_interviews_update" ON public.interview_schedules;
CREATE POLICY "cp_interviews_update"
  ON public.interview_schedules FOR UPDATE
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission = 'contributor'
    )
  );

-- ══════════════════════════════════════════════════════
-- REPORTS — les clients téléchargent les rapports
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_reports_select" ON public.reports;
CREATE POLICY "cp_reports_select"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

-- ══════════════════════════════════════════════════════
-- AUDIT_HISTORY — les clients voient l'historique
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_audit_history_select" ON public.audit_history;
CREATE POLICY "cp_audit_history_select"
  ON public.audit_history FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND cabinet_client_id IN (
      SELECT u.client_org_id FROM public.users u
      WHERE u.id = public.get_my_user_id()
        AND u.role = 'client'
    )
  );

-- USERS : pas de policy supplémentaire sur users
-- Les clients voient leur propre profil via "users_select_self" (auth_id = auth.uid())
-- Pas de policy cross-org pour éviter la récursion RLS sur la table users
