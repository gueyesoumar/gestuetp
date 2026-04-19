-- Migration: interview_schedules (UP)
-- Description: Planning des entretiens d'audit

create type public.interview_status as enum ('scheduled', 'completed', 'cancelled', 'rescheduled');

create table public.interview_schedules (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  contact_id uuid references public.client_contacts(id) on delete set null,
  auditor_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  scheduled_date date not null,
  scheduled_time time not null,
  duration_minutes integer not null default 60,
  location text,
  control_ids uuid[] not null default '{}',
  notes text,
  status public.interview_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.interview_schedules is 'Planning des entretiens d''audit avec les interlocuteurs client';
comment on column public.interview_schedules.control_ids is 'Contrôles couverts par cet entretien (array de UUIDs)';

create index idx_is_mission on public.interview_schedules(mission_id);
create index idx_is_date on public.interview_schedules(scheduled_date);
create index idx_is_auditor on public.interview_schedules(auditor_id);

create trigger trg_interview_schedules_updated_at
  before update on public.interview_schedules
  for each row execute function public.set_updated_at();

alter table public.interview_schedules enable row level security;

create policy "is_select_team"
  on public.interview_schedules for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

create policy "is_insert_team"
  on public.interview_schedules for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "is_update_team"
  on public.interview_schedules for update
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()))
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "is_delete_team"
  on public.interview_schedules for delete
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));
