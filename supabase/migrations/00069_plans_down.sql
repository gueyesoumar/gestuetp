-- Migration 00069: Plans tarifaires (DOWN)

DROP INDEX IF EXISTS idx_organizations_plan;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS plan_id;
DROP TABLE IF EXISTS public.plans;
