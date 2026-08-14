-- 00181 — RFC 0003 : moteurs de mission (workflow_version) — Phase 1 (fondation).
--
-- Deux moteurs : 'audit' (Audit complet, défaut historique) et 'controle' (Contrôle).
-- Attribution SYMÉTRIQUE et LIBRE par org (posée par le superadmin) — aucune
-- dérivation de l'édition. La mission FIGE (snapshot) le moteur de son org à la
-- création → un changement de moteur d'org n'impacte jamais les missions en cours.
-- Backfill : la valeur par défaut 'audit' couvre tout l'existant (orgs + missions).

alter table public.organizations
  add column if not exists workflow_version text not null default 'audit'
  check (workflow_version in ('audit', 'controle'));

alter table public.missions
  add column if not exists workflow_version text not null default 'audit'
  check (workflow_version in ('audit', 'controle'));

comment on column public.organizations.workflow_version is
  'RFC 0003 : moteur de mission par DÉFAUT des nouvelles missions de l''org. Posé par le superadmin (symétrique, aucune dérivation de l''édition).';
comment on column public.missions.workflow_version is
  'RFC 0003 : moteur FIGÉ (snapshot) à la création, hérité du cabinet. Missions existantes = audit.';

-- Snapshot à la création : la mission hérite du moteur de son cabinet (org).
-- SECURITY DEFINER → lit organizations sans dépendre de la RLS de l'appelant.
create or replace function public.mission_snapshot_workflow_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.workflow_version := coalesce(
    (select o.workflow_version from public.organizations o where o.id = new.cabinet_id),
    'audit');
  return new;
end $$;

create trigger trg_mission_snapshot_engine
  before insert on public.missions
  for each row execute function public.mission_snapshot_workflow_version();
