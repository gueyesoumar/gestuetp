-- Migration: cpc_select_self (UP)
-- Description: Un utilisateur voit TOUJOURS sa propre fiche client_portal_contacts
--   via user_id, indépendamment de client_org_id.
--
--   Pourquoi : plusieurs policies client (cma_select_own, cp_documents_insert…)
--   résolvent le contact par une sous-requête inline sur client_portal_contacts,
--   donc soumise à la RLS de cpc. La seule policy "self" existante
--   (cpc_select_own_org) matche sur users.client_org_id — NULL pour un assujetti
--   Regul (dont le scope est porté par entity_org_id, pas par un cabinet_client).
--   Sans cette policy, l'assujetti ne voit pas sa propre fiche → 0 accès mission.
--
--   get_my_user_id() est SECURITY DEFINER (lit users), donc pas de récursion RLS
--   sur client_portal_contacts. Bénéfique aussi à Comply (surensemble sûr : un
--   utilisateur ne voit que SA ligne).

CREATE POLICY "cpc_select_self"
  ON public.client_portal_contacts FOR SELECT
  TO authenticated
  USING (user_id = public.get_my_user_id());
