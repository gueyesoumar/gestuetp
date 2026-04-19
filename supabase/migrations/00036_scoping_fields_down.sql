-- Migration: Enrichissement missions + cabinet_clients pour le cadrage (DOWN)

alter table public.missions
  drop column if exists audit_objectives,
  drop column if exists audit_criteria,
  drop column if exists scoping_notes;

alter table public.cabinet_clients
  drop column if exists it_environment,
  drop column if exists it_systems;
