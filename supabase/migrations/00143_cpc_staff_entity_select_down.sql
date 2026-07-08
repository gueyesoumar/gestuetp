-- Migration: cpc_staff_entity_select (DOWN)
DROP POLICY IF EXISTS "cpc_select_regulator_subtree" ON public.client_portal_contacts;
