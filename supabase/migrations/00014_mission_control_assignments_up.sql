-- Migration: mission_control_assignments (UP)
-- Description: Affectation d'un auditeur a un controle dans une mission

create table public.mission_control_assignments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  auditor_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(mission_id, control_id)
);

comment on table public.mission_control_assignments is 'Quel auditeur travaille sur quel controle dans une mission';

-- Index
create index idx_mca_mission on public.mission_control_assignments(mission_id);
create index idx_mca_auditor on public.mission_control_assignments(auditor_id);
create index idx_mca_control on public.mission_control_assignments(control_id);

-- RLS
alter table public.mission_control_assignments enable row level security;

-- Les membres de la mission peuvent voir les affectations
create policy "mca_select_team"
  on public.mission_control_assignments for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = mission_control_assignments.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE reserves au service_role (chef de mission via backend)
