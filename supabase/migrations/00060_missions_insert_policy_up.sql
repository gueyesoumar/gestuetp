-- Migration 00060: Policies INSERT et UPDATE sur missions pour les cabinets (UP)
-- Description: Permettre aux utilisateurs d'un cabinet de créer des missions
-- et de mettre à jour le campaign_id (nécessaire pour les campagnes d'audit).

-- INSERT : le cabinet peut créer des missions
CREATE POLICY "missions_insert_cabinet"
  ON public.missions FOR INSERT
  TO authenticated
  WITH CHECK (cabinet_id = public.get_my_organization_id());

-- UPDATE : le cabinet peut modifier ses propres missions (campaign_id, etc.)
CREATE POLICY "missions_update_cabinet"
  ON public.missions FOR UPDATE
  TO authenticated
  USING (cabinet_id = public.get_my_organization_id())
  WITH CHECK (cabinet_id = public.get_my_organization_id());
