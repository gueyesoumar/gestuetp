-- Migration: questionnaire_skip_logic (DOWN)

alter table public.questions drop column if exists show_if;
