-- Migration: Catalogue de preuves et liaison documents (UP)

-- 1. Table catalogue des preuves attendues par controle
create table public.evidence_catalog (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  name text not null,
  description text,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.evidence_catalog is 'Catalogue des preuves attendues par controle, gere par Gestu';
comment on column public.evidence_catalog.is_required is 'Preuve obligatoire ou optionnelle';

create index idx_evidence_catalog_control on public.evidence_catalog(control_id);

create trigger trg_evidence_catalog_updated_at
  before update on public.evidence_catalog
  for each row execute function public.set_updated_at();

-- RLS
alter table public.evidence_catalog enable row level security;

create policy "evidence_catalog_select_authenticated"
  on public.evidence_catalog for select
  to authenticated
  using (true);

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)

-- 2. Table des demandes de preuves par mission (quelles preuves le cabinet demande au client)
create table public.mission_evidence_requests (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  evidence_catalog_id uuid not null references public.evidence_catalog(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(mission_id, evidence_catalog_id)
);

comment on table public.mission_evidence_requests is 'Demandes de preuves du cabinet au client pour une mission';
comment on column public.mission_evidence_requests.status is 'pending, uploaded, validated, rejected';

create index idx_mer_mission on public.mission_evidence_requests(mission_id);
create index idx_mer_evidence on public.mission_evidence_requests(evidence_catalog_id);

-- RLS
alter table public.mission_evidence_requests enable row level security;

-- Membres de la mission peuvent voir les demandes
create policy "mer_select_team"
  on public.mission_evidence_requests for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

-- Client peut voir les demandes de sa mission
create policy "mer_select_client"
  on public.mission_evidence_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_evidence_requests.mission_id
        and m.client_id = public.get_my_organization_id()
    )
  );

-- INSERT reserve au service_role (le cabinet demande via Edge Function ou backend)

-- 3. Ajouter les colonnes de liaison dans documents
alter table public.documents
  add column control_id uuid references public.controls(id) on delete set null,
  add column evidence_request_id uuid references public.mission_evidence_requests(id) on delete set null;

create index idx_documents_control on public.documents(control_id);
create index idx_documents_evidence_request on public.documents(evidence_request_id);

comment on column public.documents.control_id is 'Controle auquel ce document est lie';
comment on column public.documents.evidence_request_id is 'Demande de preuve a laquelle ce document repond';
