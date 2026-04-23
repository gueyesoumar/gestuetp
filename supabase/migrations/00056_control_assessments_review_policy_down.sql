-- Migration: control_assessments review UPDATE policy (DOWN)
DROP POLICY IF EXISTS "ca_update_lead_associate" ON public.control_assessments;
