-- Migration 00091: Restriction d'accès auditeur — DOWN
--
-- Restaure les policies "tout membre voit tout" et supprime le helper.

-- 5. mission_evidence_requests
DROP POLICY IF EXISTS "mer_select_auditor_own_controls" ON public.mission_evidence_requests;
DROP POLICY IF EXISTS "mer_select_lead_associate" ON public.mission_evidence_requests;
CREATE POLICY "mer_select_team"
  ON public.mission_evidence_requests FOR SELECT
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

-- 4. assessment_validations
DROP POLICY IF EXISTS "av_select_mission_team" ON public.assessment_validations;
CREATE POLICY "av_select_mission_team"
  ON public.assessment_validations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.control_assessments ca
      WHERE ca.id = assessment_validations.assessment_id
        AND ca.mission_id IN (SELECT public.get_my_mission_ids())
    )
  );

-- 3. control_assessments
DROP POLICY IF EXISTS "ca_select_lead_associate" ON public.control_assessments;
CREATE POLICY "ca_select_lead_associate"
  ON public.control_assessments FOR SELECT
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

-- 2. mission_control_assignments
DROP POLICY IF EXISTS "mca_select_own" ON public.mission_control_assignments;
DROP POLICY IF EXISTS "mca_select_lead_associate" ON public.mission_control_assignments;
CREATE POLICY "mca_select_team"
  ON public.mission_control_assignments FOR SELECT
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

-- 1. Helper
DROP FUNCTION IF EXISTS public.is_mission_lead_or_associate(uuid);
