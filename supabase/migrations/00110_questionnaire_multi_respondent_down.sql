-- Migration: questionnaire_multi_respondent (DOWN)

alter table public.questionnaire_instances drop column if exists section_assignees;
