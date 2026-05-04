-- Migration: assessment_findings_backfill (DOWN)
-- Description: Rollback de 00100_assessment_findings_backfill_up.sql.
-- Inverse l'ordre : drop la FK CAR.finding_id puis truncate les findings inserees.
-- Note : les colonnes legacy de control_assessments (findings, recommendations, risk_notes,
-- finding_classification) n'ont jamais ete touchees par 00100_up donc rien a restaurer cote CA.

-- 1. Retirer la FK + l'index sur corrective_action_requests
drop index if exists public.idx_car_finding;

alter table public.corrective_action_requests
  drop column if exists finding_id;

-- 2. Vider la table assessment_findings (les rows ont ete creees par le backfill)
-- truncate cascade au cas ou d'autres tables referencent assessment_findings dans le futur
truncate table public.assessment_findings cascade;
