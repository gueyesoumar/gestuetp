-- Migration 00073: Overrides de feature flags par organisation (DOWN)

DROP TABLE IF EXISTS public.feature_flag_overrides;
