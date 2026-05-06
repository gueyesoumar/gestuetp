-- Migration: interview_pv (UP)
-- Description: Phase D de la refonte des Entretiens — proces-verbal pre-rempli.
--
-- Trois ajouts :
--   1. audit_topics.default_questions : tableau de questions-cle par sujet.
--      Servent de canevas pour pre-remplir le PV d'un entretien qui couvre ce sujet.
--   2. interview_schedules.pv_template : snapshot fige a la creation de l'entretien.
--      Structure : { sections: [{ topic_id, topic_name, control_codes[], questions[] }] }
--   3. interview_schedules.pv_notes : saisie progressive de l'auditeur pendant
--      ou apres l'entretien.
--      Structure : { sections: [{ topic_id, summary, question_responses: {} }] }
--
-- pv_template est immuable apres creation (snapshot), pv_notes est libre.

alter table public.audit_topics
  add column default_questions jsonb not null default '[]'::jsonb;

comment on column public.audit_topics.default_questions is
  'Tableau de questions-cle (string[]) que l''auditeur peut poser quand il aborde ce sujet en entretien. Servent de canevas pour le PV pre-rempli.';

alter table public.interview_schedules
  add column pv_template jsonb,
  add column pv_notes jsonb;

comment on column public.interview_schedules.pv_template is
  'Canevas du PV fige au moment de la creation de l''entretien. Structure : { sections: [{ topic_id, topic_name, control_codes, questions }] }. Immuable.';

comment on column public.interview_schedules.pv_notes is
  'Saisie progressive de l''auditeur. Structure : { sections: [{ topic_id, summary, question_responses }] }. Mise a jour libre.';
