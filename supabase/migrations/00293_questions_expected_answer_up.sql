-- Réponse attendue (conforme) d'une question de cadrage.
-- Sert à la pré-suggestion de verdict en phase Travaux (levier étage 2) : une réponse
-- du client différente de l'attendu, sur un contrôle lié, signale un écart probable.
alter table public.questions
  add column if not exists expected_answer text;

comment on column public.questions.expected_answer is
  'Réponse qui indique la conformité (ex. « oui » / « non » pour un booléen, ou l''intitulé d''une option). Null = pas de polarité définie → pas de pré-suggestion.';
