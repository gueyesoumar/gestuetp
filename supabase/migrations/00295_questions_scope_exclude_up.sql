-- Valeur de réponse qui place HORS PÉRIMÈTRE les contrôles liés à la question
-- (levier L4 : cadrage → périmètre). Ex. « Développez-vous en interne ? » → « non »
-- suggère d'exclure les contrôles de développement de la mission.
alter table public.questions
  add column if not exists scope_exclude_value text;

comment on column public.questions.scope_exclude_value is
  'Si la réponse du client vaut cette valeur, les contrôles liés (question_controls) sont suggérés à l''exclusion du périmètre. Null = pas de règle de périmètre.';
