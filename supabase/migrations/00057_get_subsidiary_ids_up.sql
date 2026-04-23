-- Migration 00057: Fonction get_subsidiary_ids (UP)
-- Description: Retourne les IDs des filiales actives d'une organisation parente.
-- Utilisée dans les policies RLS et les hooks applicatifs pour le module groupe.
-- SECURITY DEFINER pour éviter la récursion RLS sur la table organizations.

CREATE OR REPLACE FUNCTION public.get_subsidiary_ids(parent_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id
  FROM public.organizations
  WHERE parent_org_id = parent_id
    AND is_active = true;
$$;

-- Accorder l'accès aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_subsidiary_ids(uuid) TO authenticated;
