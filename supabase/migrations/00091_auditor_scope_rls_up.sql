-- Migration 00091: Restriction d'accès auditeur — UP
--
-- Un auditeur (membre d'une mission qui n'est ni lead_auditor ni associate)
-- ne doit voir que les contrôles qui lui sont assignés. Les policies RLS
-- "tout membre voit tout" sont remplacées par un duo :
--
--   - lead/associate : voient toujours toute la mission
--   - auditeur       : voit uniquement ses propres assignations / assessments
--                      / validations / evidence requests liés à ses contrôles
--
-- Helper SECURITY DEFINER `is_mission_lead_or_associate(p_mission_id)` pour
-- éviter la récursion RLS (pattern déjà utilisé par get_my_mission_ids).
-- Le portail client n'est pas affecté (policies *_select_client conservées).

-- ============================================================
-- 1. Helper SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_mission_lead_or_associate(p_mission_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.missions m
    WHERE m.id = p_mission_id
      AND (
        m.lead_auditor_id = public.get_my_user_id()
        OR m.associate_id = public.get_my_user_id()
      )
  );
$$;

COMMENT ON FUNCTION public.is_mission_lead_or_associate IS
  'TRUE si l''utilisateur courant est lead_auditor ou associate de la mission. SECURITY DEFINER pour éviter la récursion RLS.';

GRANT EXECUTE ON FUNCTION public.is_mission_lead_or_associate(uuid) TO authenticated;

-- ============================================================
-- 2. mission_control_assignments — split team en 2 policies
-- ============================================================
DROP POLICY IF EXISTS "mca_select_team" ON public.mission_control_assignments;

CREATE POLICY "mca_select_lead_associate"
  ON public.mission_control_assignments FOR SELECT
  TO authenticated
  USING (public.is_mission_lead_or_associate(mission_id));

CREATE POLICY "mca_select_own"
  ON public.mission_control_assignments FOR SELECT
  TO authenticated
  USING (auditor_id = public.get_my_user_id());

-- ============================================================
-- 3. control_assessments — restreindre la lecture team
-- ============================================================
-- ca_select_auditor (auditor_id = self) reste en place côté auditeur.
-- ca_select_lead_associate devient strictement lead/asso.
DROP POLICY IF EXISTS "ca_select_lead_associate" ON public.control_assessments;
CREATE POLICY "ca_select_lead_associate"
  ON public.control_assessments FOR SELECT
  TO authenticated
  USING (public.is_mission_lead_or_associate(mission_id));

-- ============================================================
-- 4. assessment_validations — visibles si l'utilisateur peut voir
--    l'assessment associé (transitivité). Couvre auto le cas auditeur.
-- ============================================================
DROP POLICY IF EXISTS "av_select_mission_team" ON public.assessment_validations;
CREATE POLICY "av_select_mission_team"
  ON public.assessment_validations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.control_assessments ca
      WHERE ca.id = assessment_validations.assessment_id
        AND (
          public.is_mission_lead_or_associate(ca.mission_id)
          OR ca.auditor_id = public.get_my_user_id()
        )
    )
  );

-- ============================================================
-- 5. mission_evidence_requests — auditeur voit uniquement les
--    requests liées à un contrôle qu'il a en assignation.
-- ============================================================
DROP POLICY IF EXISTS "mer_select_team" ON public.mission_evidence_requests;
CREATE POLICY "mer_select_lead_associate"
  ON public.mission_evidence_requests FOR SELECT
  TO authenticated
  USING (public.is_mission_lead_or_associate(mission_id));

CREATE POLICY "mer_select_auditor_own_controls"
  ON public.mission_evidence_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.evidence_catalog ec
      JOIN public.mission_control_assignments mca
        ON mca.control_id = ec.control_id
       AND mca.mission_id = mission_evidence_requests.mission_id
      WHERE ec.id = mission_evidence_requests.evidence_catalog_id
        AND mca.auditor_id = public.get_my_user_id()
    )
  );

-- ============================================================
-- 6. Note : documents (table) NON modifiée. Un même document
--    peut servir plusieurs contrôles (PSSI, charte). Filtrer
--    sur les assignations couperait l'accès à des pièces
--    pertinentes.
-- ============================================================
