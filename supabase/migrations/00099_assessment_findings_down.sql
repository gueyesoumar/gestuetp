-- Migration: assessment_findings (DOWN)
-- Description: Rollback de 00099_assessment_findings_up.sql.
-- Note: si 00100 a deja tourne, rollbacker d'abord 00100_down (qui drop la colonne CAR.finding_id)
-- avant ce fichier, sinon le DROP TABLE casse la FK depuis corrective_action_requests.

-- DROP TABLE cascade pour supprimer les indexes, le trigger, les policies RLS
-- et toute FK eventuelle (corrective_action_requests.finding_id si encore presente).
drop table if exists public.assessment_findings cascade;
