-- Migration: questionnaire_skip_logic (UP)
-- Description: Sprint 5 — logique conditionnelle sur les questions.
--
-- Une question peut etre affichee conditionnellement selon une reponse
-- precedente. Format show_if (jsonb) :
--   { "question_code": "GOV-01", "operator": "equals", "value": "oui" }
--   { "question_code": "GOV-01", "operator": "truthy" }
--
-- Operators supportes : equals, not_equals, truthy, falsy
-- Si show_if est null, la question est toujours affichee.

alter table public.questions
  add column show_if jsonb;

comment on column public.questions.show_if is
  'Condition d''affichage. Format: { question_code, operator (equals/not_equals/truthy/falsy), value? }. NULL = toujours affichee.';
