-- Migration 00072: Feature flags Phase 2 — renommage + insertion des kill-switches IA (UP)
-- Description: Aligne les slugs des flags existants sur la nomenclature de l'audit
-- (smart_questionnaire_v2 → smart_questionnaire_ai, weekly_digest_email → evidence_reminders_digest)
-- et ajoute 8 nouveaux flags pour gater les features IA, beta et pricing tier identifiés.

-- 1. Renommage des 2 flags existants
UPDATE public.feature_flags
SET slug = 'smart_questionnaire_ai',
    name = 'Pré-remplissage IA questionnaire',
    description = 'Pré-remplissage des questionnaires de cadrage par analyse Claude des documents uploadés. Désactiver pour couper l''appel smart-questionnaire (kill-switch).'
WHERE slug = 'smart_questionnaire_v2';

UPDATE public.feature_flags
SET slug = 'evidence_reminders_digest',
    name = 'Digest hebdomadaire des relances',
    description = 'Regroupement hebdomadaire des relances de demandes de preuves en un seul email récapitulatif. Phase 2 du chantier #4.'
WHERE slug = 'weekly_digest_email';

-- 2. Insertion des 8 nouveaux flags (idempotent via ON CONFLICT)
INSERT INTO public.feature_flags (slug, name, description, is_globally_enabled) VALUES
  ('smart_analyse_control',
   'Analyse IA d''un contrôle',
   'Analyse détaillée d''un contrôle avec documents via Claude (Sonnet 4). Kill-switch pour couper en cas de coût ou de timeout.',
   true),
  ('smart_plan_mission',
   'Planification IA d''une mission',
   'Génération du plan d''audit avec assignation et risk_level via Claude (Haiku). Kill-switch.',
   true),
  ('smart_risks_ai',
   'Détection IA des risques en cadrage',
   'Extraction des risques depuis le questionnaire client via Claude. Kill-switch.',
   true),
  ('documents_anthropic_files',
   'Indexation Anthropic Files API',
   'Auto-upload des documents vers l''Anthropic Files API à chaque dépôt pour permettre les analyses IA. Kill-switch (coût + dépendance tierce).',
   true),
  ('smart_interview_portal',
   'Smart Interview côté portail client',
   'Conteneur conversationnel IA dans l''espace client (3 onglets). Beta — soft-launch sur cabinets pilotes.',
   true),
  ('supervision_group_mode',
   'Mode supervision groupe (DCSSI)',
   'Toggle entre vue Cabinet et vue Groupe pour les régulateurs / DCSSI sur le dashboard et la supervision.',
   true),
  ('report_generator_advanced',
   'Générateur rapport multi-formats',
   'Page de génération de rapports avec sélection PDF / PPTX / Word et contenu modulaire. Beta.',
   false),
  ('export_report_formats',
   'Export PPTX et Word des rapports',
   'Pricing tier : les formats PPTX et Word sont premium, le PDF reste gratuit pour tous les plans.',
   true)
ON CONFLICT (slug) DO NOTHING;
