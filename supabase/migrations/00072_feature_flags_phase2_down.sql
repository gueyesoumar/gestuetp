-- Migration 00072: Feature flags Phase 2 (DOWN)
-- Restaure les anciens slugs et supprime les 8 flags ajoutés.

DELETE FROM public.feature_flags
WHERE slug IN (
  'smart_analyse_control',
  'smart_plan_mission',
  'smart_risks_ai',
  'documents_anthropic_files',
  'smart_interview_portal',
  'supervision_group_mode',
  'report_generator_advanced',
  'export_report_formats'
);

UPDATE public.feature_flags
SET slug = 'smart_questionnaire_v2',
    name = 'Pré-remplissage IA v2',
    description = 'Pré-remplissage des questionnaires de cadrage par analyse Claude des documents uploadés.'
WHERE slug = 'smart_questionnaire_ai';

UPDATE public.feature_flags
SET slug = 'weekly_digest_email',
    name = 'Digest email hebdomadaire',
    description = 'Envoi automatique du résumé du lundi aux utilisateurs opt-in. Phase 2 du chantier #4 (relances).'
WHERE slug = 'evidence_reminders_digest';
