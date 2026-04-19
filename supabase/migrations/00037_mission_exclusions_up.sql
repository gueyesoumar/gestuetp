-- Migration: mission_exclusions (UP)
-- Description: Contrôles exclus du périmètre d'audit avec justification

create table public.mission_exclusions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(mission_id, control_id)
);

comment on table public.mission_exclusions is 'Contrôles exclus du périmètre d''audit avec justification';

create index idx_me_mission on public.mission_exclusions(mission_id);

alter table public.mission_exclusions enable row level security;

create policy "me_select_team"
  on public.mission_exclusions for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

create policy "me_insert_team"
  on public.mission_exclusions for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "me_delete_team"
  on public.mission_exclusions for delete
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));
