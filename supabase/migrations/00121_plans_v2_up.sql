-- Migration 00121: Plans v2 (UP)
-- Description: Étend la table plans pour supporter le modèle "plan-based features".
--   - tier        : free / standard / enterprise / custom (catégorisation commerciale)
--   - max_users   : limite d'utilisateurs (NULL = illimité)
--   - max_missions: limite de missions actives (NULL = illimité)
--   - updated_at  : pour tracer les modifications
--
-- Pas de modification du schéma existant (slug, name, description, monthly_price_eur,
-- is_default, created_at). Backwards-compatible.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('free', 'standard', 'enterprise', 'custom'));

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_users int;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_missions int;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.plans.tier IS 'Catégorie commerciale du plan : free, standard, enterprise, custom';
COMMENT ON COLUMN public.plans.max_users IS 'Nombre max d''utilisateurs autorisés. NULL = illimité.';
COMMENT ON COLUMN public.plans.max_missions IS 'Nombre max de missions actives. NULL = illimité.';

-- Backfill cohérent avec les 3 plans seedés en 00069
UPDATE public.plans SET tier = 'free',       max_users = 3,    max_missions = 1    WHERE slug = 'decouverte';
UPDATE public.plans SET tier = 'standard',   max_users = 20,   max_missions = NULL WHERE slug = 'pro';
UPDATE public.plans SET tier = 'enterprise', max_users = NULL, max_missions = NULL WHERE slug = 'regulateur';
