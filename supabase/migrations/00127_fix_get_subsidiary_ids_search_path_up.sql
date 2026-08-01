-- Migration 00127: Durcissement get_subsidiary_ids — SET search_path (UP)
-- Description: La fonction SECURITY DEFINER get_subsidiary_ids (00057) ne pinnait
-- pas search_path, contrairement à tous les autres helpers DEFINER du projet.
-- Comme elle est appelée dans des policies RLS (missions_select_group,
-- ca_select_group, car_select_group), c'est un vecteur de détournement de
-- search_path en contexte DEFINER. On la recrée avec SET search_path = public.
-- CREATE OR REPLACE conserve l'OID/signature : les policies dépendantes restent
-- valides, le corps est inchangé (zéro changement fonctionnel).

CREATE OR REPLACE FUNCTION public.get_subsidiary_ids(parent_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.organizations
  WHERE parent_org_id = parent_id
    AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_subsidiary_ids(uuid) TO authenticated;
