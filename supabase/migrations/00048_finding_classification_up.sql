-- Migration: finding_classification (UP)
-- Description: Classification ISO des constats + table des demandes d'actions correctives (CAR)

-- 1. Ajouter la classification sur control_assessments
ALTER TABLE public.control_assessments
  ADD COLUMN IF NOT EXISTS finding_classification text;

COMMENT ON COLUMN public.control_assessments.finding_classification IS 'Classification ISO du constat : major_nc, minor_nc, observation, strength';

-- 2. Table des demandes d'actions correctives (CAR)
CREATE TABLE public.corrective_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.control_assessments(id) ON DELETE CASCADE,
  code text NOT NULL,
  finding_classification text NOT NULL,
  control_code text,
  control_name text,
  description text NOT NULL,
  normative_reference text,
  deadline date,

  -- Client response
  client_root_cause text,
  client_action text,
  client_responsible_id uuid REFERENCES public.client_portal_contacts(id) ON DELETE SET NULL,
  client_target_date date,
  client_proof_path text,

  -- Auditor verification
  verification_status text NOT NULL DEFAULT 'pending',
  verification_comment text,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at timestamptz,

  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_car_classification CHECK (finding_classification IN ('major_nc', 'minor_nc')),
  CONSTRAINT chk_car_verification CHECK (verification_status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_car_status CHECK (status IN ('open', 'client_responded', 'verified', 'closed'))
);

COMMENT ON TABLE public.corrective_action_requests IS 'Demandes d''actions correctives (CAR) pour les non-conformités ISO';

CREATE INDEX idx_car_mission ON public.corrective_action_requests(mission_id);
CREATE INDEX idx_car_assessment ON public.corrective_action_requests(assessment_id);
CREATE INDEX idx_car_status ON public.corrective_action_requests(status);

CREATE TRIGGER trg_car_updated_at
  BEFORE UPDATE ON public.corrective_action_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.corrective_action_requests ENABLE ROW LEVEL SECURITY;

-- Auditeurs de la mission peuvent tout faire
CREATE POLICY "car_all_team"
  ON public.corrective_action_requests FOR ALL
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

-- Clients peuvent voir et répondre aux CAR de leurs missions
DROP POLICY IF EXISTS "cp_car_select" ON public.corrective_action_requests;
CREATE POLICY "cp_car_select"
  ON public.corrective_action_requests FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

DROP POLICY IF EXISTS "cp_car_update" ON public.corrective_action_requests;
CREATE POLICY "cp_car_update"
  ON public.corrective_action_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission = 'contributor'
    )
  );

-- 3. Ajouter audit_conclusion sur missions
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS audit_conclusion text,
  ADD COLUMN IF NOT EXISTS audit_conclusion_comment text;

COMMENT ON COLUMN public.missions.audit_conclusion IS 'Conclusion d''audit : conformant, partially_conformant, non_conformant';
COMMENT ON COLUMN public.missions.audit_conclusion_comment IS 'Commentaire de conclusion de l''auditeur';
