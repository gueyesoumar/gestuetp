-- Migration: client_rls_policies (DOWN)

DROP POLICY IF EXISTS "cp_missions_select" ON public.missions;
DROP POLICY IF EXISTS "cp_documents_select" ON public.documents;
DROP POLICY IF EXISTS "cp_documents_insert" ON public.documents;
DROP POLICY IF EXISTS "cp_assessments_select" ON public.control_assessments;
DROP POLICY IF EXISTS "cp_validations_select" ON public.assessment_validations;
DROP POLICY IF EXISTS "cp_validations_insert" ON public.assessment_validations;
DROP POLICY IF EXISTS "cp_qi_select" ON public.questionnaire_instances;
DROP POLICY IF EXISTS "cp_qr_select" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "cp_qr_insert" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "cp_interviews_select" ON public.interview_schedules;
DROP POLICY IF EXISTS "cp_interviews_update" ON public.interview_schedules;
DROP POLICY IF EXISTS "cp_reports_select" ON public.reports;
DROP POLICY IF EXISTS "cp_audit_history_select" ON public.audit_history;
