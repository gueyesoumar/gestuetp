-- Migration: portal_contact_entity_link (DOWN)
-- Rollback : retire le chemin entity_org_id et restaure la contrainte NOT NULL.
-- NB : suppose qu'aucun contact Regul (entity_org_id renseigné, cabinet_client_id
-- NULL) ne subsiste — sinon le ALTER ... SET NOT NULL échouera, ce qui protège
-- contre une perte de données silencieuse.

-- Restaurer la policy d'origine
DROP POLICY IF EXISTS "cpc_select_own_org" ON public.client_portal_contacts;

CREATE POLICY "cpc_select_own_org"
  ON public.client_portal_contacts FOR SELECT
  TO authenticated
  USING (
    cabinet_client_id = (
      SELECT u.client_org_id FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'client'
      LIMIT 1
    )
  );

DROP INDEX IF EXISTS public.idx_cpc_entity_org;
DROP INDEX IF EXISTS public.uq_portal_contact_entity_email;

ALTER TABLE public.client_portal_contacts
  DROP CONSTRAINT IF EXISTS chk_portal_contact_scope;

ALTER TABLE public.client_portal_contacts
  DROP COLUMN IF EXISTS entity_org_id;

ALTER TABLE public.client_portal_contacts
  ALTER COLUMN cabinet_client_id SET NOT NULL;
