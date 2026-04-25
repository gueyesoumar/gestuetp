-- Migration 00066: Échéance et timestamp de dernière relance sur mission_evidence_requests (DOWN)

DROP INDEX IF EXISTS idx_mer_status_created;
ALTER TABLE public.mission_evidence_requests
  DROP COLUMN IF EXISTS last_reminder_at,
  DROP COLUMN IF EXISTS due_date;
