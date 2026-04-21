-- Migration: finding_classification (DOWN)

ALTER TABLE public.missions DROP COLUMN IF EXISTS audit_conclusion;
ALTER TABLE public.missions DROP COLUMN IF EXISTS audit_conclusion_comment;
DROP TABLE IF EXISTS public.corrective_action_requests CASCADE;
ALTER TABLE public.control_assessments DROP COLUMN IF EXISTS finding_classification;
