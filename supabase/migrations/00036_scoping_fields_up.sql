-- Migration: Enrichissement missions + cabinet_clients pour le cadrage (UP)

-- Champs de cadrage sur missions
alter table public.missions
  add column audit_objectives text,
  add column audit_criteria text,
  add column scoping_notes text;

comment on column public.missions.audit_objectives is 'Objectifs de la mission d''audit';
comment on column public.missions.audit_criteria is 'Critères d''audit (normes, politiques, réglementations de référence)';
comment on column public.missions.scoping_notes is 'Notes libres de cadrage';

-- Champs environnement SI sur cabinet_clients
alter table public.cabinet_clients
  add column it_environment text,
  add column it_systems text[] not null default '{}';

comment on column public.cabinet_clients.it_environment is 'Description de l''environnement SI du client (infrastructure, cloud, ERP, etc.)';
comment on column public.cabinet_clients.it_systems is 'Tags des systèmes principaux (ex: SAP, Azure, ServiceNow)';
