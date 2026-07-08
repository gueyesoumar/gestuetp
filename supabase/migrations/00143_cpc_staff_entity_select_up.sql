-- Migration: cpc_staff_entity_select (UP)
-- Description: Le staff régulateur peut lister les contacts portail de SES
--   assujettis (chemin entity_org_id), pour l'UI d'invitation M7(2).
--
--   Scopé au sous-arbre du régulateur via get_subsidiary_ids(get_my_organization_id()).
--   Les policies cpc existantes (cpc_select_cabinet) sont cabinet_clients-scoped et
--   ne couvrent pas ce chemin. L'INSERT passe par l'edge fn invite-assujetti
--   (service_role) : pas de policy staff INSERT nécessaire.
--
--   get_subsidiary_ids / get_my_organization_id sont SECURITY DEFINER → pas de
--   récursion RLS sur client_portal_contacts.

CREATE POLICY "cpc_select_regulator_subtree"
  ON public.client_portal_contacts FOR SELECT
  TO authenticated
  USING (
    entity_org_id IS NOT NULL
    AND entity_org_id IN (
      SELECT public.get_subsidiary_ids(public.get_my_organization_id())
    )
  );
