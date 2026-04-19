-- Migration: assessment_validations (DOWN)

drop policy if exists "av_select_mission_team" on public.assessment_validations;
drop policy if exists "av_select_client" on public.assessment_validations;
drop table if exists public.assessment_validations cascade;
drop type if exists public.validation_decision;
drop type if exists public.validation_stage;
