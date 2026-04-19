-- Migration: user_platform_roles (UP)
-- Description: Association utilisateur <-> role plateforme

create table public.user_platform_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform_role_id uuid not null references public.platform_roles(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, platform_role_id)
);

comment on table public.user_platform_roles is 'Association N:N entre utilisateurs et roles plateforme';
comment on column public.user_platform_roles.assigned_by is 'Qui a attribue ce role';

-- Index
create index idx_user_platform_roles_user on public.user_platform_roles(user_id);
create index idx_user_platform_roles_role on public.user_platform_roles(platform_role_id);

-- RLS
alter table public.user_platform_roles enable row level security;

-- Un utilisateur peut voir ses propres roles
create policy "user_platform_roles_select_self"
  on public.user_platform_roles for select
  to authenticated
  using (
    user_id in (
      select u.id from public.users u
      where u.auth_id = auth.uid()
    )
  );

-- Les membres de la meme organisation peuvent voir les roles des collegues
create policy "user_platform_roles_select_same_org"
  on public.user_platform_roles for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      join public.users target on target.id = user_platform_roles.user_id
      where u.auth_id = auth.uid()
        and u.organization_id = target.organization_id
        and u.is_active = true
    )
  );

-- Insertion/suppression reservees au service_role pour V1
-- (les admins org gerent les roles via des fonctions backend securisees)
