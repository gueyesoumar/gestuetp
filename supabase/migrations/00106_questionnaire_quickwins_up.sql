-- Migration: questionnaire_quickwins (UP)
-- Description: Sprint 1 quick wins du questionnaire de cadrage.
--
-- 1. questionnaire_instances.due_date : date d'echeance du questionnaire
--    Permet d'afficher un compte a rebours et de declencher des relances auto
--    (J-3, J-1) via cron Edge Function (a brancher dans un sprint suivant).
--
-- 2. questionnaire_responses.skip_reason : raison de non-reponse
--    Quand le client ne sait pas / sans objet / a valider en interview.
--    Plus utile qu'un champ texte vide. Permet a l'auditeur de voir
--    explicitement les zones a creuser en Phase 4.
--
-- 3. questionnaire_responses.is_prefilled : marqueur de pre-remplissage
--    Indique qu'une reponse a ete injectee automatiquement depuis la fiche
--    client (cabinet_clients) au lancement du questionnaire. Le client peut
--    confirmer / corriger.

-- 1. Echeance sur l'instance
alter table public.questionnaire_instances
  add column due_date date;

comment on column public.questionnaire_instances.due_date is
  'Date limite de soumission du questionnaire par le client. NULL = pas d''echeance.';

create index idx_questionnaire_instances_due_date
  on public.questionnaire_instances(due_date)
  where due_date is not null;

-- 2. Skip reason sur la reponse
alter table public.questionnaire_responses
  add column skip_reason text
    check (skip_reason is null or skip_reason in ('rssi_validation', 'no_object', 'unknown'));

comment on column public.questionnaire_responses.skip_reason is
  'Raison de non-reponse : rssi_validation (a valider avec le RSSI), no_object (sans objet), unknown (je ne sais pas). NULL si reponse normale.';

-- 3. Marqueur pre-rempli
alter table public.questionnaire_responses
  add column is_prefilled boolean not null default false;

comment on column public.questionnaire_responses.is_prefilled is
  'TRUE si la reponse a ete injectee automatiquement depuis la fiche client. Le client peut confirmer/corriger sans changer ce flag (audit trail).';

-- 4. Source de pre-remplissage sur la question
alter table public.questions
  add column prefill_source text
    check (prefill_source is null or prefill_source in (
      'client.effectifs',
      'client.nombre_sites',
      'client.client_sector',
      'client.client_country',
      'client.activites_principales',
      'client.it_environment',
      'client.it_systems'
    ));

comment on column public.questions.prefill_source is
  'Si non null, l''edge function launch-questionnaire injecte automatiquement la valeur correspondante depuis cabinet_clients (ex: client.effectifs).';
