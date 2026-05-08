-- Migration 00122: Table de jonction plan_features (UP)
-- Description: Définit quelles fonctionnalités (feature_flags) sont incluses dans chaque plan.
-- Logique de résolution pour un cabinet :
--   1. Si feature_flags.is_globally_enabled = false → OFF (kill switch global)
--   2. Sinon si feature_flag_overrides existe → utiliser override (forcé ON/OFF)
--   3. Sinon si plan_features contient (cabinet.plan_id, feature.id) → ON
--   4. Sinon → OFF
--
-- RLS: SELECT public (lecture autorisée à tout authenticated, comme plans).
--      Aucune policy INSERT/UPDATE/DELETE → écriture exclusivement via service_role
--      depuis l'Edge Function admin-plans (audit log).

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id    uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  flag_id    uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, flag_id)
);

COMMENT ON TABLE public.plan_features IS
  'Mapping plan ↔ feature_flag. Définit quelles fonctionnalités sont incluses dans chaque plan tarifaire.';

CREATE INDEX IF NOT EXISTS idx_plan_features_flag ON public.plan_features(flag_id);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_features_select_all" ON public.plan_features;
CREATE POLICY "plan_features_select_all"
  ON public.plan_features FOR SELECT
  TO authenticated
  USING (true);
