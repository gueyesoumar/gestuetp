-- Migration: mission_risks (UP)
-- Description: Registre des risques initiaux identifiés lors du cadrage

create table public.mission_risks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text not null,
  risk_level public.risk_level not null default 'medium',
  description text,
  domain_ids uuid[] not null default '{}',
  source text,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mission_risks is 'Risques initiaux identifiés lors du cadrage de la mission';
comment on column public.mission_risks.domain_ids is 'Domaines du référentiel impactés par ce risque';
comment on column public.mission_risks.source is 'Source d''identification (ex: Questionnaire Q5, Audit PCI-DSS 2024, Document CMDB)';

create index idx_mr_mission on public.mission_risks(mission_id);

create trigger trg_mission_risks_updated_at
  before update on public.mission_risks
  for each row execute function public.set_updated_at();

alter table public.mission_risks enable row level security;

create policy "mr_select_team"
  on public.mission_risks for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

create policy "mr_insert_team"
  on public.mission_risks for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "mr_update_team"
  on public.mission_risks for update
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()))
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "mr_delete_team"
  on public.mission_risks for delete
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));
