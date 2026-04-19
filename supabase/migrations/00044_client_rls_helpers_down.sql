-- Migration: client_rls_helpers (DOWN)

DROP FUNCTION IF EXISTS public.get_my_contact_id();
DROP FUNCTION IF EXISTS public.is_client_role();
DROP FUNCTION IF EXISTS public.get_my_client_mission_ids();
