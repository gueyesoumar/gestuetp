-- Migration 00061: Table assessment_observations (DOWN)
DROP TABLE IF EXISTS public.assessment_observations CASCADE;
DROP TYPE IF EXISTS public.observation_response_action;
