-- Migration 00066: Échéance et timestamp de dernière relance sur mission_evidence_requests (UP)
-- Description: Permet aux Edge Functions de relance de calculer la position d'une
-- demande dans la cadence J+3/J+7/J+14, et d'éviter de relancer plus d'une fois par jour.

ALTER TABLE public.mission_evidence_requests
  ADD COLUMN due_date date,
  ADD COLUMN last_reminder_at timestamptz;

COMMENT ON COLUMN public.mission_evidence_requests.due_date IS 'Échéance optionnelle de réponse — si null, les paliers se calculent depuis created_at';
COMMENT ON COLUMN public.mission_evidence_requests.last_reminder_at IS 'Horodatage de la dernière relance email envoyée pour cette demande';

CREATE INDEX idx_mer_status_created ON public.mission_evidence_requests(status, created_at)
  WHERE status = 'pending';
