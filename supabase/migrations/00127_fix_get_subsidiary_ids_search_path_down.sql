-- Migration 00127: Durcissement get_subsidiary_ids — SET search_path (DOWN)
-- Restaure la définition d'origine (00057), sans la clause SET search_path.

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

GRANT EXECUTE ON FUNCTION public.get_subsidiary_ids(uuid) TO authenticated;
