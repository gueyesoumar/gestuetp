-- Migration: mission_members (UP)
-- Description: Equipe d'une mission + role dans la mission

create type public.mission_role as enum (
  'associate',
  'lead_auditor',
  'auditor'
);

create table public.mission_members (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.mission_role not null,
  created_at timestamptz not null default now(),
  unique(mission_id, user_id)
);

comment on table public.mission_members is 'Equipe affectee a une mission avec role';

-- Index
create index idx_mission_members_mission on public.mission_members(mission_id);
create index idx_mission_members_user on public.mission_members(user_id);

-- RLS
alter table public.mission_members enable row level security;

-- Les membres de la mission peuvent voir l'equipe
create policy "mission_members_select_team"
  on public.mission_members for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = mission_members.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- Les membres du cabinet de la mission peuvent voir l'equipe
create policy "mission_members_select_cabinet"
  on public.mission_members for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.cabinet_id
      where m.id = mission_members.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- INSERT/UPDATE/DELETE reserves au service_role

-- Policy differee depuis 00012 (dependait de mission_members)
create policy "missions_select_team"
  on public.missions for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = missions.id
        and u.auth_id = auth.uid()
    )
  );
