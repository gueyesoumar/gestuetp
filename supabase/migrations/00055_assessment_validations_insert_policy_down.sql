-- Migration: assessment_validations INSERT policy (DOWN)
DROP POLICY IF EXISTS "av_insert_mission_team" ON public.assessment_validations;
