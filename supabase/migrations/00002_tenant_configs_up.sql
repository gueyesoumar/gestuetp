-- Migration: tenant_configs (UP)
-- Description: Configuration marque blanche par organisation

create table public.tenant_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  custom_domain text unique,
  logo_url text,
  primary_color text not null default '#1E40AF',
  secondary_color text not null default '#3B82F6',
  display_name text,
  favicon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_configs is 'Configuration marque blanche (white label) par organisation';
comment on column public.tenant_configs.custom_domain is 'Ex: client.gestugroup.com';

-- Index
create index idx_tenant_configs_org on public.tenant_configs(organization_id);
create index idx_tenant_configs_domain on public.tenant_configs(custom_domain);

-- Trigger updated_at
create trigger trg_tenant_configs_updated_at
  before update on public.tenant_configs
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tenant_configs enable row level security;

-- Tout utilisateur authentifie peut lire les configs (necessaire pour le theming)
create policy "tenant_configs_select_authenticated"
  on public.tenant_configs for select
  to authenticated
  using (true);

-- La policy UPDATE dependant de public.users est dans 00006_rls_policies_up.sql
