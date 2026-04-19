-- Migration: assessment_extra_fields (UP)
-- Description: Ajoute observations, risk_notes et conformity_level aux control_assessments

ALTER TABLE public.control_assessments
  ADD COLUMN IF NOT EXISTS observations text,
  ADD COLUMN IF NOT EXISTS risk_notes text,
  ADD COLUMN IF NOT EXISTS conformity_level text;

COMMENT ON COLUMN public.control_assessments.observations IS 'Observations initiales de l''auditeur (étape Observer)';
COMMENT ON COLUMN public.control_assessments.risk_notes IS 'Notes sur le risque identifié pour ce contrôle';
COMMENT ON COLUMN public.control_assessments.conformity_level IS 'Niveau de conformité : nc, pc, lc, c, na';
