-- Migration: questionnaire_instances (UP)
-- Description: Copie de travail d'un template questionnaire pour une mission

create table public.questionnaire_instances (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  template_id uuid not null references public.questionnaire_templates(id) on delete restrict,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(mission_id, template_id)
);

comment on table public.questionnaire_instances is 'Copie figee du template au lancement de la mission';
comment on column public.questionnaire_instances.snapshot is 'Snapshot complet du template + questions au moment de la creation';

-- Index
create index idx_qi_mission on public.questionnaire_instances(mission_id);

-- RLS
alter table public.questionnaire_instances enable row level security;

-- Les membres de la mission peuvent voir le questionnaire
create policy "qi_select_mission_team"
  on public.questionnaire_instances for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = questionnaire_instances.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- Le client de la mission peut voir le questionnaire
create policy "qi_select_client"
  on public.questionnaire_instances for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = questionnaire_instances.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- INSERT reserve au service_role (creation au lancement de mission)
