-- Migration 00122: Table de jonction plan_features (DOWN)
-- Rollback de 00122_plan_features_up.sql

DROP POLICY IF EXISTS "plan_features_select_all" ON public.plan_features;
DROP TABLE IF EXISTS public.plan_features;
