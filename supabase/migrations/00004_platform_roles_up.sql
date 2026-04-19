-- Migration: platform_roles (UP)
-- Description: Roles parametrables par organisation (Associe, Senior Manager, etc.)

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  permissions jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name)
);

comment on table public.platform_roles is 'Roles parametrables par organisation. permissions en jsonb pour flexibilite.';
comment on column public.platform_roles.permissions is 'Ex: {"can_create_mission": true, "can_assign_team": true, "can_be_lead": true, "can_designate_lead": false}';
comment on column public.platform_roles.is_default is 'Role propose par defaut lors de la creation d''une organisation';

-- Index
create index idx_platform_roles_org on public.platform_roles(organization_id);

-- Trigger updated_at
create trigger trg_platform_roles_updated_at
  before update on public.platform_roles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.platform_roles enable row level security;

-- Les membres d'une organisation peuvent voir ses roles
create policy "platform_roles_select_org_members"
  on public.platform_roles for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = platform_roles.organization_id
        and u.is_active = true
    )
  );

-- Modification reservee aux admins (via service_role ou verification permission specifique)
-- Pour V1, on laisse le service_role gerer les modifications de roles
