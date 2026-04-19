-- Migration: client_rls_helpers (UP)
-- Description: Fonctions SECURITY DEFINER pour le portail client

-- Retourne les mission_ids auxquelles le client connecté a accès
CREATE OR REPLACE FUNCTION public.get_my_client_mission_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cma.mission_id
  FROM public.client_mission_access cma
  JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
  WHERE cpc.user_id = public.get_my_user_id();
$$;

-- Vérifie si l'utilisateur courant est un client
CREATE OR REPLACE FUNCTION public.is_client_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = public.get_my_user_id()
      AND role = 'client'
  );
$$;

-- Retourne le contact_id du client courant pour un cabinet_client donné
CREATE OR REPLACE FUNCTION public.get_my_contact_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.client_portal_contacts
  WHERE user_id = public.get_my_user_id()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_client_mission_ids() IS 'SECURITY DEFINER — retourne les mission_ids accessibles au client courant via client_mission_access';
COMMENT ON FUNCTION public.is_client_role() IS 'SECURITY DEFINER — vérifie si le user courant a le rôle client';
COMMENT ON FUNCTION public.get_my_contact_id() IS 'SECURITY DEFINER — retourne le contact_id du client courant';
