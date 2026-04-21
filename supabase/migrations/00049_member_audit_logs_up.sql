-- Migration: member_audit_logs (UP)
-- Description: Table d'historique des actions sur les membres (invitation, rôles, activation)

CREATE TABLE public.member_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  performed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_audit_action CHECK (action IN (
    'invited', 'role_assigned', 'role_removed',
    'deactivated', 'reactivated', 'invitation_resent'
  ))
);

COMMENT ON TABLE public.member_audit_logs IS 'Historique des actions effectuées sur les membres de l''organisation';

CREATE INDEX idx_audit_target ON public.member_audit_logs(target_user_id);
CREATE INDEX idx_audit_org ON public.member_audit_logs(organization_id);
CREATE INDEX idx_audit_created ON public.member_audit_logs(created_at DESC);

ALTER TABLE public.member_audit_logs ENABLE ROW LEVEL SECURITY;

-- Les membres de la même organisation peuvent consulter l'historique
CREATE POLICY "audit_select_org"
  ON public.member_audit_logs FOR SELECT
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

-- Les membres peuvent insérer des entrées pour leur propre organisation
CREATE POLICY "audit_insert_org"
  ON public.member_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_my_organization_id()
    AND performed_by = public.get_my_user_id()
  );
