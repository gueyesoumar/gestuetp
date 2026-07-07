-- Rollback 00136 : retire get_entity_descendants, restaure get_subsidiary_ids
-- en version mono-niveau (00057) et supprime organizations.entity_type.
-- ATTENTION : la suppression de la colonne perd la classification des entités.

DROP FUNCTION IF EXISTS public.get_entity_descendants(uuid);

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

ALTER TABLE public.organizations DROP COLUMN IF EXISTS entity_type;
