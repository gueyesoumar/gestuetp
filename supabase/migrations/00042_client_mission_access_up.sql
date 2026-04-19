-- Migration: client_mission_access (UP)
-- Description: Contrôle d'accès fin : quel contact client a accès à quelle mission

CREATE TABLE public.client_mission_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.client_portal_contacts(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'contributor',
  granted_by uuid NOT NULL REFERENCES public.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_cma_permission CHECK (permission IN ('contributor', 'viewer')),
  CONSTRAINT uq_cma_contact_mission UNIQUE (contact_id, mission_id)
);

COMMENT ON TABLE public.client_mission_access IS 'Liaison contact client ↔ mission avec niveau de permission. Un contact doit avoir un accès explicite pour voir une mission.';

CREATE INDEX idx_cma_contact ON public.client_mission_access(contact_id);
CREATE INDEX idx_cma_mission ON public.client_mission_access(mission_id);

ALTER TABLE public.client_mission_access ENABLE ROW LEVEL SECURITY;

-- Les auditeurs de la mission peuvent gérer les accès
CREATE POLICY "cma_select_team"
  ON public.client_mission_access FOR SELECT
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

CREATE POLICY "cma_insert_team"
  ON public.client_mission_access FOR INSERT
  TO authenticated
  WITH CHECK (mission_id IN (SELECT public.get_my_mission_ids()));

CREATE POLICY "cma_update_team"
  ON public.client_mission_access FOR UPDATE
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

CREATE POLICY "cma_delete_team"
  ON public.client_mission_access FOR DELETE
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

-- Les clients voient leurs propres accès
CREATE POLICY "cma_select_own"
  ON public.client_mission_access FOR SELECT
  TO authenticated
  USING (
    contact_id IN (
      SELECT cpc.id FROM public.client_portal_contacts cpc
      WHERE cpc.user_id = public.get_my_user_id()
    )
  );
