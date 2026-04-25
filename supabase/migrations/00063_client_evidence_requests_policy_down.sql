-- Migration 00063: Policy SELECT sur mission_evidence_requests pour portail client (DOWN)
DROP POLICY IF EXISTS "mer_select_client_portal" ON public.mission_evidence_requests;
