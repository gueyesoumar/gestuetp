-- Migration: questionnaire_extended_types (DOWN)

alter table public.questions
  drop constraint if exists chk_questions_question_type;

comment on column public.questions.question_type is
  'text, textarea, single_choice, multiple_choice, boolean, file_upload';
