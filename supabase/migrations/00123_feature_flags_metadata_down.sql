-- Migration 00123: Métadonnées sur feature_flags (DOWN)
-- Rollback de 00123_feature_flags_metadata_up.sql

DROP INDEX IF EXISTS idx_feature_flags_category;
ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS icon_name;
ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS maturity;
ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS category;
