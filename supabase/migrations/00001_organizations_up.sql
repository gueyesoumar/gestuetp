-- Migration: organizations (UP)
-- Description: Table des organisations (cabinets, clients, groupes, fonds)

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  types text[] not null default '{}',
  parent_org_id uuid references public.organizations(id) on delete set null,
  logo_url text,
  website text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Cabinets, groupes, fonds, clients. types[] permet cumul de roles.';
comment on column public.organizations.types is 'Ex: ["cabinet"], ["client"], ["cabinet","client"]';
comment on column public.organizations.parent_org_id is 'Structure groupe/filiales';

-- Index
create index idx_organizations_parent on public.organizations(parent_org_id);
create index idx_organizations_slug on public.organizations(slug);
create index idx_organizations_types on public.organizations using gin(types);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- RLS
alter table public.organizations enable row level security;

-- Les utilisateurs authentifies peuvent voir les organisations actives
create policy "organizations_select_authenticated"
  on public.organizations for select
  to authenticated
  using (is_active = true);

-- Les policies UPDATE dependant de public.users sont dans 00006_rls_policies_up.sql
-- Insertion reservee au service role (creation d'org via backend)
