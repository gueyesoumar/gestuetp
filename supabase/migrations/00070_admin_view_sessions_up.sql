-- Migration 00070: Trace des consultations de compte par les super-admins (UP)
-- Description: Quand un super-admin ouvre l'aperçu détaillé d'un utilisateur ou
-- d'un cabinet, on enregistre la session pour audit + notification RGPD au target.
-- Lecture seule par construction — la table sert au log, pas à l'autorisation.

CREATE TABLE public.admin_view_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid NOT NULL REFERENCES public.users(id),
  target_user_id  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_org_id   uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  reason          text NOT NULL CHECK (length(trim(reason)) > 0),
  started_at      timestamptz NOT NULL DEFAULT now(),
  notified        boolean NOT NULL DEFAULT false,
  CHECK (target_user_id IS NOT NULL OR target_org_id IS NOT NULL)
);

COMMENT ON TABLE public.admin_view_sessions IS 'Trace des consultations de comptes par les platform owners. Notifie le target.';
COMMENT ON COLUMN public.admin_view_sessions.notified IS 'true quand la notification RGPD a été poussée au target';

CREATE INDEX idx_avs_admin ON public.admin_view_sessions(admin_id);
CREATE INDEX idx_avs_target_user ON public.admin_view_sessions(target_user_id);
CREATE INDEX idx_avs_target_org ON public.admin_view_sessions(target_org_id);
CREATE INDEX idx_avs_started ON public.admin_view_sessions(started_at DESC);

ALTER TABLE public.admin_view_sessions ENABLE ROW LEVEL SECURITY;

-- Lecture pour les owners (audit) ; insertion via service-role uniquement
CREATE POLICY "avs_owner_select"
  ON public.admin_view_sessions FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());
