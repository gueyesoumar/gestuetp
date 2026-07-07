-- 00136 — Axe 1 refonte module Groupe : structuration des entités internes.
--
-- 1) organizations.entity_type : classe la nature d'une entité interne d'un
--    groupe (filiale juridique / site / direction / business unit). NULL pour
--    les cabinets, groupes et clients — aucune régression sur l'existant.
-- 2) get_subsidiary_ids devient RÉCURSIF (multi-niveaux) : un groupe voit
--    désormais aussi les petits-enfants. Aujourd'hui la hiérarchie est
--    mono-niveau -> 0 changement sur les données actuelles, mais débloque
--    l'arbre. UNION (et non UNION ALL) garantit la terminaison même en cas de
--    cycle accidentel dans parent_org_id.
-- 3) get_entity_descendants : variante RÉCURSIVE incluant les entités
--    DÉSACTIVÉES, réservée au service_role (Edge Function manage-entity) pour
--    lister/gérer l'arbre complet — la RLS (via get_subsidiary_ids) reste
--    active-only, donc une entité désactivée n'expose aucune donnée métier.

-- 1) Typage des entités internes -------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS entity_type text
  CHECK (entity_type IS NULL OR entity_type IN ('filiale', 'site', 'direction', 'business_unit'));

COMMENT ON COLUMN public.organizations.entity_type IS
  'Nature de l''entité interne d''un groupe : filiale | site | direction | business_unit. NULL pour cabinets/groupes/clients.';

-- 2) get_subsidiary_ids récursif (active-only, utilisé par la RLS) ----------
CREATE OR REPLACE FUNCTION public.get_subsidiary_ids(parent_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id
    FROM public.organizations
    WHERE parent_org_id = parent_id
      AND is_active = true
    UNION
    SELECT o.id
    FROM public.organizations o
    JOIN tree t ON o.parent_org_id = t.id
    WHERE o.is_active = true
  )
  SELECT id FROM tree;
$$;

GRANT EXECUTE ON FUNCTION public.get_subsidiary_ids(uuid) TO authenticated;

-- 3) get_entity_descendants (incl. désactivées) — service_role uniquement ---
CREATE OR REPLACE FUNCTION public.get_entity_descendants(parent_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id
    FROM public.organizations
    WHERE parent_org_id = parent_id
    UNION
    SELECT o.id
    FROM public.organizations o
    JOIN tree t ON o.parent_org_id = t.id
  )
  SELECT id FROM tree;
$$;

GRANT EXECUTE ON FUNCTION public.get_entity_descendants(uuid) TO service_role;
