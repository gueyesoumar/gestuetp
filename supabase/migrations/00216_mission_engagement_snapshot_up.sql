-- Migration 00216 (UP) — P1b.2 (RFC 0007) : snapshot probant du contexte
-- d'engagement, figé par mission. Le profil vivant (engagement_profiles) peut
-- évoluer ; le snapshot conserve l'état au moment de l'audit pour le rapport.
-- Additif. Dépend de 00215 (engagement_profiles) et de engagement_id (00213/00156).

alter table public.missions
  add column if not exists engagement_snapshot jsonb;

comment on column public.missions.engagement_snapshot is
  'Snapshot fige du profil d''engagement a l''ouverture de la mission (RFC 0007 P1b). Source probante pour le rapport.';

-- Backfill : figer le profil courant pour les missions déjà rattachées à une arête.
update public.missions m
set engagement_snapshot = jsonb_build_object(
  'effectifs', ep.effectifs,
  'chiffre_affaires', ep.chiffre_affaires,
  'nombre_sites', ep.nombre_sites,
  'activites_principales', ep.activites_principales,
  'structure_hierarchique', ep.structure_hierarchique,
  'parties_interessees', ep.parties_interessees,
  'exigences_reglementaires', ep.exigences_reglementaires,
  'audit_objectives', ep.audit_objectives,
  'audit_criteria', ep.audit_criteria,
  'scoping_notes', ep.scoping_notes,
  'it_environment', ep.it_environment,
  'it_systems', to_jsonb(ep.it_systems),
  'notes', ep.notes,
  'captured_at', now()
)
from public.engagement_profiles ep
where ep.engagement_id = m.engagement_id
  and m.engagement_snapshot is null;
