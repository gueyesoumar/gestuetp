-- Migration: assessment_findings_backfill (DOWN)
-- Description: Rollback de 00100_assessment_findings_backfill_up.sql.
-- Inverse l'ordre : drop la FK CAR.finding_id puis truncate les findings inserees.
-- Note : les colonnes legacy de control_assessments (findings, recommendations, risk_notes,
-- finding_classification) n'ont jamais ete touchees par 00100_up donc rien a restaurer cote CA.

-- 1. Retirer la FK + l'index sur corrective_action_requests
drop index if exists public.idx_car_finding;

alter table public.corrective_action_requests
  drop column if exists finding_id;

-- 2. NE PAS vider assessment_findings (correctif revue pré-audit).
-- ANCIENNE version : `truncate table public.assessment_findings cascade;` — DANGEREUX.
-- Depuis 00100, la table est alimentée par le flux applicatif normal (N findings par
-- évaluation) : un truncate ici détruirait TOUTES les données réelles, pas seulement
-- le backfill initial. Rollback rendu volontairement NO-OP sur les données (cf. 00140_down)
-- pour éviter toute perte. Rollback strict = à faire manuellement après sauvegarde.
select 1;
