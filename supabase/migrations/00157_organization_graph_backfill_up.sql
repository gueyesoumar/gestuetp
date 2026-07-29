-- Migration 00157 (UP) : backfill du graphe — RFC 0001, étape 2
-- Peuple organization_relationships depuis l'existant, SANS perte et sans changer
-- le comportement (aucun code ne lit encore ces tables).
-- Idempotent (gardes WHERE NOT EXISTS). Capacités : différées (décision C).
-- La nature de parent_org_id est AUTO-DÉTECTÉE par instance (décision B) :
--   Regul (table regulatory_measures présente) -> regulatory_supervision
--   Comply                                     -> group_ownership

-- ── 1. Arêtes self : une par organisation ─────────────────────────────────────
insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
select o.id, o.id, 'self', 'active'
from public.organizations o
where not exists (
  select 1 from public.organization_relationships r
  where r.actor_org_id = o.id and r.target_org_id = o.id
    and r.nature = 'self' and r.status = 'active'
);

-- ── 2. Arêtes audit_engagement : missions ∪ cabinet_clients (décision A) ───────
with pairs as (
  select cabinet_id as actor, client_org_id as target
  from public.cabinet_clients
  where client_org_id is not null
  union
  select cabinet_id as actor, client_id as target
  from public.missions
  where cabinet_id is not null and client_id is not null
)
insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
select p.actor, p.target, 'audit_engagement', 'active'
from pairs p
where p.actor <> p.target
  and exists (select 1 from public.organizations o where o.id = p.actor)
  and exists (select 1 from public.organizations o where o.id = p.target)
  and not exists (
    select 1 from public.organization_relationships r
    where r.actor_org_id = p.actor and r.target_org_id = p.target
      and r.nature = 'audit_engagement' and r.status = 'active'
  );

-- ── 3. Arêtes parent_org_id -> group_ownership | regulatory_supervision ────────
insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
select
  o.parent_org_id,
  o.id,
  (case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'regulatory_measures'
    ) then 'regulatory_supervision' else 'group_ownership' end)::public.relationship_nature,
  'active'
from public.organizations o
where o.parent_org_id is not null
  and o.parent_org_id <> o.id
  and not exists (
    select 1 from public.organization_relationships r
    where r.actor_org_id = o.parent_org_id and r.target_org_id = o.id
      and r.nature in ('group_ownership', 'regulatory_supervision')
      and r.status = 'active'
  );

-- ── 4. Lier les missions à leur arête d'engagement (décision #3) ───────────────
update public.missions m
set engagement_id = r.id
from public.organization_relationships r
where r.actor_org_id = m.cabinet_id
  and r.target_org_id = m.client_id
  and r.nature = 'audit_engagement'
  and r.status = 'active'
  and m.engagement_id is null;
