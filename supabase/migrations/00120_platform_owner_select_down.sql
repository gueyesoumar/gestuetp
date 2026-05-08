-- Migration 00120: Platform owner SELECT global (DOWN)
-- Rollback de 00120_platform_owner_select_up.sql

DROP POLICY IF EXISTS "missions_select_platform_owner" ON public.missions;
DROP POLICY IF EXISTS "mission_members_select_platform_owner" ON public.mission_members;
DROP POLICY IF EXISTS "mca_select_platform_owner" ON public.mission_control_assignments;
DROP POLICY IF EXISTS "ca_select_platform_owner" ON public.control_assessments;
DROP POLICY IF EXISTS "av_select_platform_owner" ON public.assessment_validations;
DROP POLICY IF EXISTS "af_select_platform_owner" ON public.assessment_findings;
DROP POLICY IF EXISTS "qi_select_platform_owner" ON public.questionnaire_instances;
DROP POLICY IF EXISTS "qr_select_platform_owner" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "documents_select_platform_owner" ON public.documents;
DROP POLICY IF EXISTS "cp_select_platform_owner" ON public.control_planning;
DROP POLICY IF EXISTS "client_contacts_select_platform_owner" ON public.client_contacts;
DROP POLICY IF EXISTS "interview_schedules_select_platform_owner" ON public.interview_schedules;
DROP POLICY IF EXISTS "interview_topics_select_platform_owner" ON public.interview_topics;
DROP POLICY IF EXISTS "interview_actors_select_platform_owner" ON public.interview_actors;
DROP POLICY IF EXISTS "mr_select_platform_owner" ON public.mission_risks;
DROP POLICY IF EXISTS "control_comments_select_platform_owner" ON public.control_comments;
DROP POLICY IF EXISTS "cabinet_clients_select_platform_owner" ON public.cabinet_clients;
DROP POLICY IF EXISTS "client_portal_contacts_select_platform_owner" ON public.client_portal_contacts;
DROP POLICY IF EXISTS "client_mission_access_select_platform_owner" ON public.client_mission_access;
DROP POLICY IF EXISTS "client_action_items_select_platform_owner" ON public.client_action_items;
DROP POLICY IF EXISTS "question_controls_select_platform_owner" ON public.question_controls;
