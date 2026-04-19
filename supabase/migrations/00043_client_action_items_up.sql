-- Migration: client_action_items (UP)
-- Description: Plan d'action post-audit — recommandations à suivre par le client

CREATE TABLE public.client_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  control_id uuid REFERENCES public.controls(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.control_assessments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  status text NOT NULL DEFAULT 'open',
  assigned_contact_id uuid REFERENCES public.client_portal_contacts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_action_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT chk_action_status CHECK (status IN ('open', 'in_progress', 'done'))
);

COMMENT ON TABLE public.client_action_items IS 'Recommandations d''audit à suivre par le client. Créées par l''auditeur, mises à jour par le client.';

CREATE INDEX idx_cai_mission ON public.client_action_items(mission_id);
CREATE INDEX idx_cai_control ON public.client_action_items(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX idx_cai_assigned ON public.client_action_items(assigned_contact_id) WHERE assigned_contact_id IS NOT NULL;
CREATE INDEX idx_cai_status ON public.client_action_items(status);

CREATE TRIGGER trg_cai_updated_at
  BEFORE UPDATE ON public.client_action_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_action_items ENABLE ROW LEVEL SECURITY;

-- Les auditeurs de la mission peuvent tout faire
CREATE POLICY "cai_all_team"
  ON public.client_action_items FOR ALL
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

-- Les clients peuvent voir les actions de leurs missions
CREATE POLICY "cai_select_client"
  ON public.client_action_items FOR SELECT
  TO authenticated
  USING (
    mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
    )
  );

-- Les clients contributeurs peuvent mettre à jour le statut
CREATE POLICY "cai_update_client"
  ON public.client_action_items FOR UPDATE
  TO authenticated
  USING (
    mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission = 'contributor'
    )
  );
