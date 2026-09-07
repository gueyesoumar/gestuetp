-- Migration 00215 (UP) — P1b.1 (RFC 0007) : profil d'engagement.
-- Source de vérité du CONTEXTE DE MISSION (décision §8.1 = SPLIT), porté par
-- l'arête audit_engagement (décision D2 : table dédiée 1-1). L'identité durable
-- reste sur le nœud organizations. Les lecteurs continuent de lire cabinet_clients
-- (double-écriture) jusqu'à la bascule en vue (P1c). Purement additif.
-- Dépend de P1a (00214) : les arêtes audit_engagement existent pour toutes les fiches.

create table if not exists public.engagement_profiles (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique
    references public.organization_relationships(id) on delete cascade,
  -- Contexte de mission (miroir des colonnes de cabinet_clients hors identité).
  effectifs text,
  chiffre_affaires text,
  nombre_sites integer,
  activites_principales text,
  structure_hierarchique text,
  parties_interessees jsonb not null default '[]',
  exigences_reglementaires jsonb not null default '[]',
  it_environment text,
  it_systems text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.engagement_profiles is
  'Contexte de mission (RFC 0007 P1b) porte par l''arete audit_engagement. Source de verite ; cabinet_clients en miroir jusqu''a P1c.';

create index if not exists idx_engagement_profiles_engagement
  on public.engagement_profiles(engagement_id);

create trigger trg_engagement_profiles_updated_at
  before update on public.engagement_profiles
  for each row execute function public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.engagement_profiles enable row level security;

-- Lecture : cote ACTEUR de l'arete (le cabinet auditeur). get_my_organization_id()
-- est SECURITY DEFINER et ne lit PAS engagement_profiles -> aucune recursion.
-- L'audite (portail, role=client) n'accede PAS au dossier cabinet (matrice §3.4 ;
-- get_my_organization_id() renvoie NULL pour role=client -> aucune ligne).
create policy "engagement_profiles_select_actor" on public.engagement_profiles
  for select to authenticated
  using (
    engagement_id in (
      select r.id from public.organization_relationships r
      where r.actor_org_id = public.get_my_organization_id()
        and r.nature = 'audit_engagement'
    )
  );

-- Ecritures : AUCUNE policy authenticated -> reserve au service_role (Edge Functions
-- create-client / update-client), coherent avec le graphe.

-- ── Backfill : un profil par arete audit_engagement active, depuis la fiche ─────
-- La fiche est unique par (cabinet, client_name) et pointe client_org_id ; on la
-- rattache a l'arete (actor=cabinet_id, target=client_org_id).
insert into public.engagement_profiles (
  engagement_id, effectifs, chiffre_affaires, nombre_sites, activites_principales,
  structure_hierarchique, parties_interessees, exigences_reglementaires,
  it_environment, it_systems, notes
)
select distinct on (r.id)
  r.id,
  cc.effectifs, cc.chiffre_affaires, cc.nombre_sites, cc.activites_principales,
  cc.structure_hierarchique, coalesce(cc.parties_interessees, '[]'::jsonb),
  coalesce(cc.exigences_reglementaires, '[]'::jsonb),
  cc.it_environment, coalesce(cc.it_systems, '{}'::text[]), cc.notes
from public.organization_relationships r
join public.cabinet_clients cc
  on cc.cabinet_id = r.actor_org_id and cc.client_org_id = r.target_org_id
where r.nature = 'audit_engagement' and r.status = 'active'
  and not exists (
    select 1 from public.engagement_profiles ep where ep.engagement_id = r.id
  )
order by r.id, cc.updated_at desc;
