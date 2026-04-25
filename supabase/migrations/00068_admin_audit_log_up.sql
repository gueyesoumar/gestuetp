-- Migration 00068: Audit log des actions super-admin (UP)
-- Description: Trace inviolable de chaque geste effectué depuis /admin.
-- Motif obligatoire (NOT NULL), insertion via service-role uniquement.
-- Pas de DELETE policy — la table est insertion-only.

CREATE TABLE public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.users(id),
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid,
  reason      text NOT NULL CHECK (length(trim(reason)) > 0),
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_log IS 'Trace des actions super-admin Gëstu. Motif obligatoire, insertion-only.';
COMMENT ON COLUMN public.admin_audit_log.action IS 'Ex: suspend_cabinet, reactivate_cabinet, reset_user_password, change_user_role, export_cabinet_data';
COMMENT ON COLUMN public.admin_audit_log.target_type IS 'Ex: organization, user, mission';
COMMENT ON COLUMN public.admin_audit_log.metadata IS 'Données contextuelles (ancien/nouveau rôle, taille export, etc.)';

CREATE INDEX idx_aal_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_aal_actor ON public.admin_audit_log(actor_id);
CREATE INDEX idx_aal_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX idx_aal_action ON public.admin_audit_log(action);

-- RLS — lecture pour les owners, INSERT via service-role uniquement
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aal_owner_select"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());
