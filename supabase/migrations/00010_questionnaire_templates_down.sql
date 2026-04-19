-- Migration: questionnaire_templates (DOWN)

drop trigger if exists trg_questionnaire_templates_updated_at on public.questionnaire_templates;
drop policy if exists "questionnaire_templates_select_authenticated" on public.questionnaire_templates;
drop table if exists public.questionnaire_templates cascade;
