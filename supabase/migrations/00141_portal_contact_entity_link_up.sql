-- Migration: portal_contact_entity_link (UP)
-- Description: Rendre client_portal_contacts polymorphe pour supporter le portail
--   assujetti de Gëstu Regul (M7) sans forker le moteur de cloisonnement.
--
--   Une partie auditée est polymorphe :
--     - Comply  -> cabinet_client_id (fiche client d'un cabinet)
--     - Regul   -> entity_org_id (organisation assujettie, avec son profil
--                  réglementaire) ; on ne passe JAMAIS par cabinet_clients.
--   Un contact appartient à exactement l'un des deux (CHECK). Le moteur RLS
--   (get_my_client_mission_ids, client_mission_access, policies cp_*) reste
--   strictement partagé : aucune divergence.

-- 1. cabinet_client_id devient optionnel (les contacts Regul ne l'utilisent pas)
ALTER TABLE public.client_portal_contacts
  ALTER COLUMN cabinet_client_id DROP NOT NULL;

-- 2. Nouveau chemin : l'org assujettie (Regul)
ALTER TABLE public.client_portal_contacts
  ADD COLUMN entity_org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.client_portal_contacts.entity_org_id IS
  'Regul : org assujettie à laquelle le contact est rattaché. Exclusif avec cabinet_client_id.';

-- 3. Exactement une des deux références (XOR) — les lignes Comply existantes
--    (cabinet_client_id renseigné, entity_org_id NULL) satisfont le CHECK.
ALTER TABLE public.client_portal_contacts
  ADD CONSTRAINT chk_portal_contact_scope
  CHECK ((cabinet_client_id IS NOT NULL) <> (entity_org_id IS NOT NULL));

-- 4. Unicité de l'email par org assujettie (le pendant de uq_portal_contact_email)
CREATE UNIQUE INDEX uq_portal_contact_entity_email
  ON public.client_portal_contacts(entity_org_id, email)
  WHERE entity_org_id IS NOT NULL;

CREATE INDEX idx_cpc_entity_org ON public.client_portal_contacts(entity_org_id)
  WHERE entity_org_id IS NOT NULL;

-- 5. Le client/assujetti voit les contacts de sa propre partie auditée
--    (cabinet_client_id en Comply OU entity_org_id en Regul, selon client_org_id).
DROP POLICY IF EXISTS "cpc_select_own_org" ON public.client_portal_contacts;

CREATE POLICY "cpc_select_own_org"
  ON public.client_portal_contacts FOR SELECT
  TO authenticated
  USING (
    (
      cabinet_client_id IS NOT NULL
      AND cabinet_client_id = (
        SELECT u.client_org_id FROM public.users u
        WHERE u.auth_id = auth.uid() AND u.role = 'client'
        LIMIT 1
      )
    )
    OR (
      entity_org_id IS NOT NULL
      AND entity_org_id = (
        SELECT u.client_org_id FROM public.users u
        WHERE u.auth_id = auth.uid() AND u.role = 'client'
        LIMIT 1
      )
    )
  );
