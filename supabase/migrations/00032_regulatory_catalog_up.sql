-- Migration: Catalogue des exigences réglementaires (UP)

create table public.regulatory_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null unique,
  type text not null,
  jurisdiction text not null,
  applicable_sectors text[] not null default '{}',
  description text not null,
  key_obligations jsonb not null default '[]',
  penalties text,
  authority text,
  reference_url text,
  related_controls jsonb not null default '[]',
  impact text not null default 'fort',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.regulatory_catalog is 'Catalogue des exigences réglementaires internalisées — Sénégal, UEMOA, CEDEAO, International';
comment on column public.regulatory_catalog.type is 'legale, reglementaire, sectorielle, normative';
comment on column public.regulatory_catalog.jurisdiction is 'Sénégal, UEMOA, CEDEAO, CIMA, International';
comment on column public.regulatory_catalog.applicable_sectors is 'Secteurs concernés : Tous, Banque, Assurance, Télécoms, etc.';
comment on column public.regulatory_catalog.key_obligations is 'Ex: [{"obligation": "Nommer un DPO", "article": "Art. 16"}, ...]';
comment on column public.regulatory_catalog.related_controls is 'Ex: [{"framework": "ISO 27001", "controls": ["A.5.34", "A.5.31"]}, ...]';
comment on column public.regulatory_catalog.impact is 'fort, moyen, faible';

create index idx_regulatory_catalog_jurisdiction on public.regulatory_catalog(jurisdiction);
create index idx_regulatory_catalog_type on public.regulatory_catalog(type);
create index idx_regulatory_catalog_sectors on public.regulatory_catalog using gin(applicable_sectors);

create trigger trg_regulatory_catalog_updated_at
  before update on public.regulatory_catalog
  for each row execute function public.set_updated_at();

-- RLS
alter table public.regulatory_catalog enable row level security;

create policy "regulatory_catalog_select_authenticated"
  on public.regulatory_catalog for select
  to authenticated
  using (is_active = true);

-- INSERT/UPDATE/DELETE réservé au service_role (admin Gëstu)
