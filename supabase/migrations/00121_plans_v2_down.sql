-- Migration 00121: Plans v2 (DOWN)
-- Rollback de 00121_plans_v2_up.sql

ALTER TABLE public.plans DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.plans DROP COLUMN IF EXISTS max_missions;
ALTER TABLE public.plans DROP COLUMN IF EXISTS max_users;
ALTER TABLE public.plans DROP COLUMN IF EXISTS tier;
