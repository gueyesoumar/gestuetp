-- Migration 00063: Policy SELECT sur mission_evidence_requests pour portail client (UP)
-- Description: La policy existante "mer_select_client" utilise client_id = get_my_organization_id()
-- ce qui ne fonctionne pas pour les utilisateurs du portail client (leur organization_id
-- pointe vers le cabinet, pas le client). Cette migration ajoute une policy compatible
-- avec le pattern de migration 00045.

CREATE POLICY "mer_select_client_portal"
  ON public.mission_evidence_requests FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );
