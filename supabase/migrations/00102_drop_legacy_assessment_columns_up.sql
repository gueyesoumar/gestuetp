-- Migration: drop_legacy_assessment_columns (UP)
-- Description: Suppression des colonnes legacy de public.control_assessments suite a la migration
-- vers le modele findings-centric (table assessment_findings, cf 00099 + 00100).
--
-- Colonnes supprimees :
--   - findings (text)               : remplace par assessment_findings.description (N par assessment)
--   - recommendations (text)        : remplace par assessment_findings.recommendation
--   - risk_notes (text)              : remplace par assessment_findings.risk
--   - finding_classification (text)  : remplace par assessment_findings.classification
--   - ai_draft (text)                : feature deprecated (remplacee par smart-analyse retournant findings[])
--
-- Pre-requis (verifie avant migration) :
--   - 00100 a backfille les findings existants depuis ces colonnes
--   - Tous les consumers SQL/JS ont ete refactores (Vague 2 : UI editing + display + Edge functions + reports)
--   - corrective_action_requests.finding_id est rempli pour tous les CARs (via 00100 backfill)
--
-- Down : ADD COLUMN back (sans restauration des donnees, irreversible)

alter table public.control_assessments
  drop column if exists findings,
  drop column if exists recommendations,
  drop column if exists risk_notes,
  drop column if exists finding_classification,
  drop column if exists ai_draft;
