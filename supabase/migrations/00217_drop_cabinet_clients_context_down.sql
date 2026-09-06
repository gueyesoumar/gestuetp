-- Migration 00217 (DOWN) — P1c.1 Pass D (RFC 0007).
-- Ré-ajoute les colonnes de contexte et les repeuple depuis engagement_profiles
-- (source de vérité). Réversible sans perte tant que engagement_profiles existe.

alter table public.cabinet_clients
  add column if not exists effectifs text,
  add column if not exists chiffre_affaires text,
  add column if not exists nombre_sites integer,
  add column if not exists activites_principales text,
  add column if not exists structure_hierarchique text,
  add column if not exists parties_interessees jsonb not null default '[]',
  add column if not exists exigences_reglementaires jsonb not null default '[]',
  add column if not exists it_environment text,
  add column if not exists it_systems text[] not null default '{}',
  add column if not exists notes text;

update public.cabinet_clients cc
set effectifs = ep.effectifs,
    chiffre_affaires = ep.chiffre_affaires,
    nombre_sites = ep.nombre_sites,
    activites_principales = ep.activites_principales,
    structure_hierarchique = ep.structure_hierarchique,
    parties_interessees = coalesce(ep.parties_interessees, '[]'::jsonb),
    exigences_reglementaires = coalesce(ep.exigences_reglementaires, '[]'::jsonb),
    it_environment = ep.it_environment,
    it_systems = coalesce(ep.it_systems, '{}'::text[]),
    notes = ep.notes
from public.organization_relationships r
join public.engagement_profiles ep on ep.engagement_id = r.id
where r.actor_org_id = cc.cabinet_id
  and r.target_org_id = cc.client_org_id
  and r.nature = 'audit_engagement'
  and r.status = 'active';
