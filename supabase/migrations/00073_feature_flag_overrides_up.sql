-- Migration 00073: Overrides de feature flags par organisation (UP)
-- Description: Permet de forcer l'état d'un flag pour un cabinet précis,
-- en surcouche du is_globally_enabled. La résolution dans useFeatureFlag()
-- devient à 2 niveaux : override pour l'org du user, sinon global.

CREATE TABLE public.feature_flag_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id         uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled         boolean NOT NULL,
  reason          text NOT NULL CHECK (length(trim(reason)) > 0),
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_id, organization_id)
);

COMMENT ON TABLE public.feature_flag_overrides IS 'Overrides par organisation. La présence d''une ligne fait foi (enabled true ou false) ; absence = hérite du global.';

CREATE INDEX idx_ffo_org ON public.feature_flag_overrides(organization_id);
CREATE INDEX idx_ffo_flag ON public.feature_flag_overrides(flag_id);

-- Trigger updated_at
CREATE TRIGGER trg_ffo_updated_at
  BEFORE UPDATE ON public.feature_flag_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS — lecture libre pour les utilisateurs authentifiés (le hook useFeatureFlag()
-- doit pouvoir lire l'override de SON org). Écriture via Edge Function (service-role).
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

-- Lecture : seulement l'override qui concerne l'org de l'utilisateur courant
CREATE POLICY "ffo_read_own_org"
  ON public.feature_flag_overrides FOR SELECT
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

-- Lecture : platform owners voient tous les overrides (pour l'admin UI)
CREATE POLICY "ffo_read_platform_owner"
  ON public.feature_flag_overrides FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());
