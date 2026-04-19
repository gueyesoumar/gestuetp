-- Migration: frameworks (UP)
-- Description: Referentiels de conformite (ISO 27001, COBIT, ITIL, NIST, etc.)
-- Geres et maintenus par Gestu, pas par les clients

create table public.frameworks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  version text,
  publisher text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.frameworks is 'Referentiels de conformite geres par Gestu';

-- Index
create index idx_frameworks_slug on public.frameworks(slug);

-- Trigger updated_at
create trigger trg_frameworks_updated_at
  before update on public.frameworks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.frameworks enable row level security;

-- Lecture pour tous les utilisateurs authentifies
create policy "frameworks_select_authenticated"
  on public.frameworks for select
  to authenticated
  using (is_active = true);

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)
