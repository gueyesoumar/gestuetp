-- Migration: assessment_extra_fields (DOWN)

ALTER TABLE public.control_assessments
  DROP COLUMN IF EXISTS observations,
  DROP COLUMN IF EXISTS risk_notes,
  DROP COLUMN IF EXISTS conformity_level;
