-- Migration 00123: Métadonnées sur feature_flags (UP)
-- Description: Enrichit feature_flags pour le revamp UI "Fonctionnalités" :
--   - category   : groupement par usage métier (ai, reporting, branding, security, collab, general)
--   - maturity   : niveau de maturité produit (stable, beta, new)
--   - icon_name  : slug d'icône lucide-react pour l'UI (optionnel)

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('ai', 'reporting', 'branding', 'security', 'collab', 'general'));

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS maturity text NOT NULL DEFAULT 'stable'
    CHECK (maturity IN ('stable', 'beta', 'new'));

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS icon_name text;

COMMENT ON COLUMN public.feature_flags.category IS 'Groupement métier : ai, reporting, branding, security, collab, general.';
COMMENT ON COLUMN public.feature_flags.maturity IS 'Niveau de maturité : stable, beta, new.';
COMMENT ON COLUMN public.feature_flags.icon_name IS 'Slug d''icône lucide-react (ex: sparkles, file-text). Optionnel.';

CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON public.feature_flags(category);
