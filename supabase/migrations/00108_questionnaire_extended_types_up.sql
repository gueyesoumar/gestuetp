-- Migration: questionnaire_extended_types (UP)
-- Description: Sprint 4 — etend les types de questions du questionnaire.
--
-- Avant : text, textarea, single_choice, multiple_choice, boolean, file_upload
-- Apres : ajoute 'date', 'number', 'scale_percent', 'file', 'organigramme'.
--
-- 'file' remplace 'file_upload' (pas d'usage existant verifie au seed).
-- 'organigramme' = upload + future extraction IA des acteurs.

alter table public.questions
  add constraint chk_questions_question_type
    check (question_type in (
      'text',
      'textarea',
      'single_choice',
      'multiple_choice',
      'boolean',
      'date',
      'number',
      'scale_percent',
      'file',
      'organigramme'
    ));

comment on column public.questions.question_type is
  'Type de reponse : text, textarea, single_choice, multiple_choice, boolean, date, number, scale_percent (0-100 par paliers de 25), file (upload), organigramme (upload + extraction IA).';
