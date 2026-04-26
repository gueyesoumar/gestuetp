-- Migration 00071: Feature flags globaux (UP)
-- Description: Permet d'activer/désactiver une fonctionnalité produit en runtime
-- sans redéploiement. Phase 2 = global on/off uniquement (per-cabinet en Phase 2.5).

CREATE TABLE public.feature_flags (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  name                  text NOT NULL,
  description           text,
  is_globally_enabled   boolean NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.feature_flags IS 'Feature flags produit. Lecture publique authentifiée, écriture via Edge Function admin.';
COMMENT ON COLUMN public.feature_flags.slug IS 'Identifiant stable utilisé côté front : useFeatureFlag(''slug'')';

CREATE INDEX idx_feature_flags_slug ON public.feature_flags(slug);

-- Trigger updated_at
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS — lecture libre pour les utilisateurs authentifiés, écriture via service-role
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ff_read_all" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

-- Seed des 4 flags initiaux (état OFF par défaut, à activer côté admin)
INSERT INTO public.feature_flags (slug, name, description, is_globally_enabled) VALUES
  ('weekly_digest_email',
   'Digest email hebdomadaire',
   'Envoi automatique du résumé du lundi aux utilisateurs opt-in. Phase 2 du chantier #4 (relances).',
   false),
  ('smart_questionnaire_v2',
   'Pré-remplissage IA v2',
   'Pré-remplissage des questionnaires de cadrage par analyse Claude des documents uploadés.',
   true),
  ('ai_pre_review',
   'Pré-revue IA des constats',
   'Génération d''une revue préliminaire par Claude avant la validation lead. Expérimental.',
   false),
  ('multi_framework_dashboard',
   'Dashboard cross-référentiels',
   'Vue agrégée des scores de conformité ISO + PSSI + RGPD sur un même cabinet.',
   false);
