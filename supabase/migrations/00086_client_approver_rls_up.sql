-- Migration 00086: RLS portail client — élargissement à 'approver' — UP
--
-- approver hérite de tous les droits contributor (logique inclusive). Toutes
-- les policies portail client qui filtraient permission='contributor' filtrent
-- désormais permission IN ('contributor', 'approver').
--
-- Exception : assessment_validations.INSERT au stade client_review est
-- approver-only. Cela ferme également le bug de sécurité pré-existant sur
-- l'edge function client-review-assessment (qui acceptait n'importe quel
-- membre du client org, indépendamment de la permission).

-- ============================================================
-- documents.INSERT (00045_client_rls_policies_up.sql)
-- ============================================================
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
        AND cma.permission IN ('contributor', 'approver')
    )
  );

-- ============================================================
-- assessment_validations.INSERT — APPROVER ONLY (client_review stage)
-- ============================================================
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
          AND cma.permission = 'approver'
      )
    )
  );

-- ============================================================
-- questionnaire_responses.INSERT
-- ============================================================
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
          AND cma.permission IN ('contributor', 'approver')
      )
    )
  );

-- ============================================================
-- interview_schedules.UPDATE
-- ============================================================
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
        AND cma.permission IN ('contributor', 'approver')
    )
  );

-- ============================================================
-- client_action_items.UPDATE (00043_client_action_items_up.sql)
-- ============================================================
DROP POLICY IF EXISTS "cai_update_client" ON public.client_action_items;
CREATE POLICY "cai_update_client"
  ON public.client_action_items FOR UPDATE
  TO authenticated
  USING (
    mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission IN ('contributor', 'approver')
    )
  );

-- ============================================================
-- assessment_observations.INSERT (00061_assessment_observations_up.sql)
-- ============================================================
DROP POLICY IF EXISTS "obs_insert_client" ON public.assessment_observations;
CREATE POLICY "obs_insert_client"
  ON public.assessment_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client_role()
    AND observation_by = public.get_my_user_id()
    AND assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      WHERE ca.mission_id IN (
        SELECT cma.mission_id FROM public.client_mission_access cma
        JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
        WHERE cpc.user_id = public.get_my_user_id()
          AND cma.permission IN ('contributor', 'approver')
      )
    )
  );

-- ============================================================
-- corrective_action_requests.UPDATE (00048_finding_classification_up.sql)
-- ============================================================
DROP POLICY IF EXISTS "cp_car_update" ON public.corrective_action_requests;
CREATE POLICY "cp_car_update"
  ON public.corrective_action_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission IN ('contributor', 'approver')
    )
  );
