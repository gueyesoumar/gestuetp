-- Migration 00157 (UP) : backfill du graphe — RFC 0001, étape 2
-- Peuple organization_relationships depuis l'existant, SANS perte et sans changer
-- le comportement (aucun code ne lit encore ces tables).
-- Idempotent (gardes WHERE NOT EXISTS). Capacités : différées (décision C).
--
-- Nature de parent_org_id : les deux instances partageant le MÊME schéma, aucun
-- marqueur serveur ne les distingue de façon fiable. On la passe donc en variable
-- psql `parent_nature` (défaut group_ownership) :
--   Comply : psql -f 00157_..._up.sql                                   (défaut)
--   Regul  : psql -v parent_nature=regulatory_supervision -f 00157_..._up.sql
\if :{?parent_nature}
\else
\set parent_nature group_ownership
\endif

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

-- ── 3. Arêtes parent_org_id -> nature fournie par la variable parent_nature ────
insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
select
  o.parent_org_id,
  o.id,
  :'parent_nature'::public.relationship_nature,
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
