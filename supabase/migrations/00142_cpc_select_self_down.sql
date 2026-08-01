-- Migration: cpc_select_self (DOWN)
DROP POLICY IF EXISTS "cpc_select_self" ON public.client_portal_contacts;
