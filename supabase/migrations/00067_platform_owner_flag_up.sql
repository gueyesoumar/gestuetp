-- Migration 00067: Flag platform owner sur users (UP)
-- Description: Marque les comptes super-admin Gëstu (équipe éditeur).
-- Sécurité critique: ce flag ne doit JAMAIS être modifiable via l'UI.
-- Nomination des premiers owners par UPDATE manuel dans le SQL Editor :
--   UPDATE public.users SET is_platform_owner = true WHERE email = 'oumar@gestucomply.com';

ALTER TABLE public.users
  ADD COLUMN is_platform_owner boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_platform_owner IS 'Flag super-admin Gëstu (éditeur). Modifiable uniquement via SQL Editor — JAMAIS via UI.';

-- Helper SECURITY DEFINER : exposable aux RLS et aux Edge Functions
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND is_platform_owner = true
      AND is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_platform_owner() IS 'SECURITY DEFINER — true si l''appelant est un super-admin Gëstu actif';

-- Politique additive sur les lectures sensibles : les owners voient tous les utilisateurs
CREATE POLICY "users_select_platform_owner"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());

-- Idem pour organizations (pour l'écran liste des cabinets)
CREATE POLICY "organizations_select_platform_owner"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());
