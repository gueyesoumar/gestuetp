-- Migration 00058: Policies RLS pour la supervision groupe (UP)
-- Description: Permettre aux utilisateurs d'un groupe (type "group") de lire
-- les missions et évaluations de leurs entités supervisées (via parent_org_id).
-- Utilise get_subsidiary_ids() (SECURITY DEFINER) pour éviter la récursion RLS.

-- ══════════════════════════════════════════════════════
-- MISSIONS — le groupe voit les missions de ses entités
-- ══════════════════════════════════════════════════════
CREATE POLICY "missions_select_group"
  ON public.missions FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT public.get_subsidiary_ids(public.get_my_organization_id())
    )
  );

-- ══════════════════════════════════════════════════════
-- CONTROL_ASSESSMENTS — le groupe voit les évaluations
-- ══════════════════════════════════════════════════════
CREATE POLICY "ca_select_group"
  ON public.control_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = control_assessments.mission_id
        AND m.client_id IN (
          SELECT public.get_subsidiary_ids(public.get_my_organization_id())
        )
    )
  );

-- ══════════════════════════════════════════════════════
-- CORRECTIVE_ACTION_REQUESTS — le groupe voit les CARs
-- ══════════════════════════════════════════════════════
CREATE POLICY "car_select_group"
  ON public.corrective_action_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = corrective_action_requests.mission_id
        AND m.client_id IN (
          SELECT public.get_subsidiary_ids(public.get_my_organization_id())
        )
    )
  );
