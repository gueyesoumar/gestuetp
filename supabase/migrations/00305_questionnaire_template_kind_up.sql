-- RFC 0015 Lot 1 : type de formule sur les templates de questionnaire.
--   'context'         = questionnaire de prise de connaissance (rédigé ; l'auditeur évalue)
--   'self_assessment' = auto-évaluation (généré depuis les contrôles ; le client s'auto-note)
-- Tous les templates existants prennent 'context' par défaut -> non-régression totale
-- (le flux actuel ne change pas tant qu'aucun template self_assessment n'est lancé).
alter table public.questionnaire_templates
  add column if not exists kind text not null default 'context'
    check (kind in ('context', 'self_assessment'));
