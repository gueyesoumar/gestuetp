-- Migration: drop_legacy_assessment_columns (DOWN)
-- Description: Re-ajoute les colonnes legacy. Les donnees ne sont PAS restaurees
-- (elles vivent maintenant dans assessment_findings). Cette down sert uniquement a
-- preserver la signature de schema en cas de rollback brutal ; les colonnes seront
-- vides et il faudra recopier depuis assessment_findings si besoin.

alter table public.control_assessments
  add column if not exists findings text,
  add column if not exists recommendations text,
  add column if not exists risk_notes text,
  add column if not exists finding_classification text,
  add column if not exists ai_draft text;
