-- Migration: questionnaire_instances (DOWN)

drop policy if exists "qi_select_mission_team" on public.questionnaire_instances;
drop policy if exists "qi_select_client" on public.questionnaire_instances;
drop table if exists public.questionnaire_instances cascade;
