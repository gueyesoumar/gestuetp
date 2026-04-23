-- Migration: control_assessments review UPDATE policy (UP)
-- Description: Permettre au chef de mission et à l'associé de modifier le statut
-- des contrôles lors de la revue (submitted → in_review → approved/rejected)

CREATE POLICY "ca_update_lead_associate"
  ON public.control_assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.users u ON u.auth_id = auth.uid()
      WHERE m.id = control_assessments.mission_id
        AND (m.lead_auditor_id = u.id OR m.associate_id = u.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.users u ON u.auth_id = auth.uid()
      WHERE m.id = control_assessments.mission_id
        AND (m.lead_auditor_id = u.id OR m.associate_id = u.id)
    )
  );
