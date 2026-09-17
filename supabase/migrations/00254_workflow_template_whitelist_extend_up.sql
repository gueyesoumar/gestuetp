-- Migration 00254 (UP) — RFC 0009 : élargit la liste blanche des templates.
--
-- Ajoute 4 sous-étapes désélectionnables (contenu pur, aucun gate n'en dépend) :
--   planning.interviews  — onglet Entretiens de la Planification
--   review.quality       — encart de synthèse qualité de la Revue interne
--   review.discussion    — panneau de discussion de la Revue interne
--   closure.report       — générateur de rapport avancé de la Clôture
-- Le noyau structurant (programme de travail, décision de revue, bouton Clôturer,
-- étapes guidées analyser/valider) reste EXCLU.

alter table public.organization_workflow_templates
  drop constraint chk_workflow_template_whitelist;

alter table public.organization_workflow_templates
  add constraint chk_workflow_template_whitelist check (
    disabled_steps <@ array[
      'client_review', 'action_plan',
      'scoping.risks', 'scoping.questionnaire', 'scoping.documents', 'scoping.actors',
      'planning.interviews', 'review.quality', 'review.discussion', 'closure.report'
    ]::text[]
  );
