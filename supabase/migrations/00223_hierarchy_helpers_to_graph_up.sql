-- Migration 00223 (UP) — P4a (RFC 0007) : bascule des helpers de hiérarchie sur le
-- GRAPHE. get_subsidiary_ids / get_my_parent_org_id lisaient parent_org_id ; ils
-- lisent désormais les arêtes group_ownership / regulatory_supervision (parité
-- graphe ↔ parent_org_id VÉRIFIÉE : bijection exacte). Aucune policy ni edge function
-- n'est modifiée — elles appellent les mêmes fonctions, désormais graphe-natives.
-- parent_org_id reste écrit (manage-entity + trigger sync_org_parent_edge) et lu par
-- le frontend jusqu'à P4b. Sémantique identique à visible_target_ids (00162).

-- Descendants d'un nœud via les arêtes de hiérarchie (paramétré ; racine non incluse).
create or replace function public.get_subsidiary_ids(parent_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive tree(org_id) as (
    select r.target_org_id
    from public.organization_relationships r
    join public.organizations o on o.id = r.target_org_id and o.is_active
    where r.actor_org_id = parent_id
      and r.status = 'active'
      and r.nature in ('group_ownership', 'regulatory_supervision')
    union
    select r.target_org_id
    from public.organization_relationships r
    join tree t on r.actor_org_id = t.org_id
    join public.organizations o on o.id = r.target_org_id and o.is_active
    where r.status = 'active'
      and r.nature in ('group_ownership', 'regulatory_supervision')
  )
  select org_id from tree;
$$;

-- Org parente (superviseur / groupe) de mon org, via l'arête entrante.
create or replace function public.get_my_parent_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select r.actor_org_id
  from public.organization_relationships r
  where r.target_org_id = public.get_my_organization_id()
    and r.status = 'active'
    and r.nature in ('group_ownership', 'regulatory_supervision')
  limit 1;
$$;
