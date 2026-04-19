-- Migration: users (UP)
-- Description: Utilisateurs de la plateforme, rattaches a une organisation

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_url text,
  job_title text,
  is_active boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Utilisateurs plateforme, lies a auth.users via auth_id';
comment on column public.users.auth_id is 'Reference vers auth.users.id (Supabase Auth)';

-- Index
create index idx_users_auth_id on public.users(auth_id);
create index idx_users_organization on public.users(organization_id);
create index idx_users_email on public.users(email);

-- Trigger updated_at
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- RLS
alter table public.users enable row level security;

-- Un utilisateur peut lire son propre profil
create policy "users_select_self"
  on public.users for select
  to authenticated
  using (auth_id = auth.uid());

-- Un utilisateur peut voir les membres de sa propre organisation
create policy "users_select_same_org"
  on public.users for select
  to authenticated
  using (
    organization_id in (
      select u.organization_id from public.users u
      where u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- Un utilisateur peut modifier son propre profil
create policy "users_update_self"
  on public.users for update
  to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());
