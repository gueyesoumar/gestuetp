-- Migration 00087: Déclaration de document non disponible — DOWN
--
-- ATTENTION : avant rollback, normaliser les statuts pour qu'ils tiennent
-- dans l'ancienne machine à états (sinon un check antérieur reposé pourrait
-- échouer). On ramène les nouveaux statuts à 'pending' pour préserver la
-- traçabilité minimale.

-- 1. Drop policies
DROP POLICY IF EXISTS "mer_update_client_decline" ON public.mission_evidence_requests;
DROP POLICY IF EXISTS "mer_update_auditor_decision" ON public.mission_evidence_requests;

-- 2. Drop check constraint
ALTER TABLE public.mission_evidence_requests
  DROP CONSTRAINT IF EXISTS chk_mer_status;

-- 3. Normaliser les statuts pour respecter l'ancien modèle
UPDATE public.mission_evidence_requests
SET status = 'pending'
WHERE status IN ('declined_by_client', 'accepted', 'reissued', 'escalated_to_finding');

-- 4. Drop index
DROP INDEX IF EXISTS public.idx_mer_status;

-- 5. Drop nouvelles colonnes
ALTER TABLE public.mission_evidence_requests
  DROP COLUMN IF EXISTS decline_reason,
  DROP COLUMN IF EXISTS decline_justification,
  DROP COLUMN IF EXISTS declined_by,
  DROP COLUMN IF EXISTS declined_at,
  DROP COLUMN IF EXISTS auditor_response,
  DROP COLUMN IF EXISTS auditor_decided_by,
  DROP COLUMN IF EXISTS auditor_decided_at,
  DROP COLUMN IF EXISTS escalated_assessment_id;

-- 6. Restaurer le commentaire d'origine
COMMENT ON COLUMN public.mission_evidence_requests.status IS 'pending, uploaded, validated, rejected';
