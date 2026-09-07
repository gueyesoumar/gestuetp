-- Migration 00224 (UP) — P4b (RFC 0007) : retrait de organizations.parent_org_id.
-- La hiérarchie vit désormais dans le graphe (arêtes group_ownership/regulatory_supervision).
-- Helpers RLS déjà bascule (00223) ; get_entity_descendants basculé ici ; le writer
-- manage-entity écrit les arêtes directement ; le trigger de sync devient inutile.

-- 1) get_entity_descendants (incl. entités désactivées) → graphe.
create or replace function public.get_entity_descendants(parent_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive tree(org_id) as (
    select r.target_org_id
    from public.organization_relationships r
    where r.actor_org_id = parent_id and r.status = 'active'
      and r.nature in ('group_ownership', 'regulatory_supervision')
    union
    select r.target_org_id
    from public.organization_relationships r
    join tree t on r.actor_org_id = t.org_id
    where r.status = 'active'
      and r.nature in ('group_ownership', 'regulatory_supervision')
  )
  select org_id from tree;
$$;

-- 2) Le trigger qui synchronisait les arêtes DEPUIS parent_org_id n'a plus lieu d'être
--    (manage-entity écrit les arêtes ; plus aucune écriture de parent_org_id).
drop trigger if exists trg_sync_org_parent_edge on public.organizations;
drop function if exists public.sync_org_parent_edge();

-- 3) Policy audit_campaigns (filiale) : lisait parent_org_id DIRECTEMENT dans son
--    USING → dépendance dure. Repointée sur get_my_parent_org_id() (graphe, 00223).
drop policy if exists "campaigns_select_subsidiary" on public.audit_campaigns;
create policy "campaigns_select_subsidiary" on public.audit_campaigns for select to authenticated
  using (organization_id = public.get_my_parent_org_id());

-- 4) Retrait de la colonne + son index.
drop index if exists public.idx_organizations_parent;
alter table public.organizations drop column if exists parent_org_id;
