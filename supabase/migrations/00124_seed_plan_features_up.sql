-- Migration 00124: Seed initial plan_features (UP)
-- Description: Pour éviter toute régression UX au déploiement, on initialise plan_features
-- avec TOUTES les feature_flags actuellement is_globally_enabled = true incluses dans
-- TOUS les plans existants. L'état effectif d'un cabinet reste donc identique
-- avant/après migration. L'admin pourra ensuite restreindre certaines features par plan
-- via la page /admin/plans.
--
-- Idempotent : ON CONFLICT DO NOTHING.

INSERT INTO public.plan_features (plan_id, flag_id)
SELECT p.id, f.id
FROM public.plans p
CROSS JOIN public.feature_flags f
WHERE f.is_globally_enabled = true
ON CONFLICT (plan_id, flag_id) DO NOTHING;
