-- Migration 00156 (UP) : graphe relationnel des organisations — RFC 0001, étape 1
-- PUREMENT ADDITIF. Aucune donnée modifiée, aucune policy existante touchée.
-- Le backfill (étape 2 : cabinet_clients/parent_org_id/Regul → arêtes, capacités)
-- et la primitive visible_target_ids() (étape 3) font l'objet de migrations séparées.
-- types[], cabinet_clients, parent_org_id et les policies actuelles restent intacts.

-- ── Enums ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.relationship_nature as enum
    ('self','audit_engagement','group_ownership','regulatory_supervision','delegation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.relationship_status as enum ('active','ended','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_capability as enum
    ('comply','risk','policy','privacy','awareness','incidents','measures','supervision');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.capability_status as enum ('active','trial','disabled');
exception when duplicate_object then null; end $$;

-- ── Arêtes typées entre organisations ─────────────────────────────────────────
create table if not exists public.organization_relationships (
  id uuid primary key default gen_random_uuid(),
  actor_org_id uuid not null references public.organizations(id) on delete cascade,
  target_org_id uuid not null references public.organizations(id) on delete cascade,
  nature public.relationship_nature not null,
  status public.relationship_status not null default 'active',
  -- null = contrat de visibilité par défaut de la nature ; sinon surcharge (décision #2).
  -- jsonb libre : validation applicative obligatoire côté backend à l'écriture.
  visibility_overrides jsonb,
  scope jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint org_rel_self_consistency check (
    (nature = 'self' and actor_org_id = target_org_id)
    or (nature <> 'self' and actor_org_id <> target_org_id)
  )
);

comment on table public.organization_relationships is
  'Aretes typees entre organisations (RFC 0001). Remplacera parent_org_id, cabinet_clients et le hack Regul. Le role d''une org est emergent de ses aretes.';

create index if not exists idx_org_rel_actor  on public.organization_relationships(actor_org_id);
create index if not exists idx_org_rel_target on public.organization_relationships(target_org_id);
-- Une seule arête ACTIVE d'une nature donnée entre deux orgs.
create unique index if not exists uq_org_rel_active
  on public.organization_relationships(actor_org_id, target_org_id, nature)
  where status = 'active';

-- ── Capacités (modules) par organisation ──────────────────────────────────────
create table if not exists public.organization_capabilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  capability public.org_capability not null,
  status public.capability_status not null default 'active',
  granted_at timestamptz not null default now(),
  unique (org_id, capability)
);

comment on table public.organization_capabilities is
  'Modules activables par organisation (RFC 0001). Le type ne gate plus le module ; l''edition definit un preset de capacites.';

create index if not exists idx_org_cap_org on public.organization_capabilities(org_id);

-- ── Lien mission → arête d'engagement (décision #3) ────────────────────────────
-- Nullable, rempli à l'étape 2. Aucun code actuel ne le référence → sans impact.
alter table public.missions
  add column if not exists engagement_id uuid
  references public.organization_relationships(id) on delete set null;
create index if not exists idx_missions_engagement on public.missions(engagement_id);

-- ── RLS (activée dès la création) ──────────────────────────────────────────────
alter table public.organization_relationships enable row level security;
alter table public.organization_capabilities  enable row level security;

-- Lecture : une org voit ses propres arêtes (acteur OU cible).
-- get_my_organization_id() est SECURITY DEFINER → aucune récursion (ne lit pas cette table).
-- Pour role=client, get_my_organization_id() renvoie NULL → aucune ligne (visibilité
-- entrante côté portail viendra avec visible_target_ids(), étape 3).
create policy "org_rel_select_own" on public.organization_relationships
  for select to authenticated
  using (
    actor_org_id = public.get_my_organization_id()
    or target_org_id = public.get_my_organization_id()
  );

create policy "org_cap_select_own" on public.organization_capabilities
  for select to authenticated
  using (org_id = public.get_my_organization_id());

-- Écritures : AUCUNE policy authenticated → réservé au service_role (créer une arête /
-- accorder une capacité = acte sensible passant par le backend). Cohérent avec le
-- pattern "écritures sensibles en service_role".
