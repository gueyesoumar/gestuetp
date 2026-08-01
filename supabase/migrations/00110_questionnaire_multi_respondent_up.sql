-- Migration: questionnaire_multi_respondent (UP)
-- Description: Sprint 6 — assignation des sections du questionnaire a des
-- respondents distincts cote client.
--
-- section_assignees est un objet jsonb : { [section_prefix]: user_id }
-- Si une section n'est pas dans l'objet, tous les utilisateurs portail du
-- client peuvent la voir/repondre (comportement par defaut).
-- Si une section est assignee, seul l'utilisateur designe la voit dans son
-- wizard. L'auditeur voit toujours tout en suivi.

alter table public.questionnaire_instances
  add column section_assignees jsonb not null default '{}'::jsonb;

comment on column public.questionnaire_instances.section_assignees is
  'Map { section_prefix → user_id } : assigne chaque section a un respondent client. Cle absente = pas d''assignation = visible par tous les users du portail.';
