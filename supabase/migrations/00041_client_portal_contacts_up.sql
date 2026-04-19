-- Migration: client_portal_contacts (UP)
-- Description: Contacts client pour le portail, liés à la fiche client (cabinet_clients)

CREATE TABLE public.client_portal_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_client_id uuid NOT NULL REFERENCES public.cabinet_clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  job_title text,
  portal_status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_portal_status CHECK (portal_status IN ('pending', 'invited', 'active')),
  CONSTRAINT uq_portal_contact_email UNIQUE (cabinet_client_id, email)
);

COMMENT ON TABLE public.client_portal_contacts IS 'Contacts du client pour le portail. Un contact est lié à une fiche client (cabinet_clients), pas à une mission.';

CREATE INDEX idx_cpc_cabinet_client ON public.client_portal_contacts(cabinet_client_id);
CREATE INDEX idx_cpc_user ON public.client_portal_contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cpc_email ON public.client_portal_contacts(email);

CREATE TRIGGER trg_cpc_updated_at
  BEFORE UPDATE ON public.client_portal_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_portal_contacts ENABLE ROW LEVEL SECURITY;

-- Les auditeurs du cabinet peuvent voir/gérer les contacts de leurs clients
CREATE POLICY "cpc_select_cabinet"
  ON public.client_portal_contacts FOR SELECT
  TO authenticated
  USING (
    cabinet_client_id IN (
      SELECT cc.id FROM public.cabinet_clients cc
      WHERE cc.cabinet_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "cpc_insert_cabinet"
  ON public.client_portal_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    cabinet_client_id IN (
      SELECT cc.id FROM public.cabinet_clients cc
      WHERE cc.cabinet_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "cpc_update_cabinet"
  ON public.client_portal_contacts FOR UPDATE
  TO authenticated
  USING (
    cabinet_client_id IN (
      SELECT cc.id FROM public.cabinet_clients cc
      WHERE cc.cabinet_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "cpc_delete_cabinet"
  ON public.client_portal_contacts FOR DELETE
  TO authenticated
  USING (
    cabinet_client_id IN (
      SELECT cc.id FROM public.cabinet_clients cc
      WHERE cc.cabinet_id = public.get_my_organization_id()
    )
  );

-- Les clients peuvent voir les contacts de leur propre organisation
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
