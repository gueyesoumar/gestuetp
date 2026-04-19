-- Migration: control_planning (UP)
-- Description: Programme de travail par contrôle par mission (risque, techniques, heures, échantillonnage)

create type public.risk_level as enum ('critical', 'high', 'medium', 'low');
create type public.audit_technique as enum ('inspection', 'entretien', 'observation', 'reexecution', 'echantillon', 'analytique');

create table public.control_planning (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  risk_level public.risk_level not null default 'medium',
  audit_techniques public.audit_technique[] not null default '{}',
  sampling_population integer,
  sampling_size integer,
  estimated_hours numeric(5,1) not null default 2.0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mission_id, control_id)
);

comment on table public.control_planning is 'Programme de travail : paramètres de planification par contrôle et par mission';
comment on column public.control_planning.risk_level is 'Niveau de risque évalué pour ce contrôle dans cette mission';
comment on column public.control_planning.audit_techniques is 'Techniques d''audit prévues (inspection, entretien, observation, etc.)';
comment on column public.control_planning.sampling_population is 'Taille de la population pour l''échantillonnage (null si non applicable)';
comment on column public.control_planning.sampling_size is 'Taille de l''échantillon prévu';
comment on column public.control_planning.estimated_hours is 'Budget heures estimé pour ce contrôle';

create index idx_cp_mission on public.control_planning(mission_id);
create index idx_cp_control on public.control_planning(control_id);

create trigger trg_control_planning_updated_at
  before update on public.control_planning
  for each row execute function public.set_updated_at();

alter table public.control_planning enable row level security;

create policy "cp_select_team"
  on public.control_planning for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

create policy "cp_update_team"
  on public.control_planning for update
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()))
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "cp_insert_team"
  on public.control_planning for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));
