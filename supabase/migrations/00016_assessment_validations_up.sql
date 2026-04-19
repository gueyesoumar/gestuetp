-- Migration: assessment_validations (UP)
-- Description: Historique de validation d'un controle (cascade de validation)

create type public.validation_stage as enum (
  'auditor_submitted',
  'lead_review',
  'associate_review',
  'client_review'
);

create type public.validation_decision as enum (
  'approved',
  'rejected'
);

create table public.assessment_validations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.control_assessments(id) on delete cascade,
  stage public.validation_stage not null,
  decision public.validation_decision not null,
  comment text,
  validated_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.assessment_validations is 'Historique complet des validations/rejets d''un controle';
comment on column public.assessment_validations.comment is 'Obligatoire en cas de rejet';

-- Index
create index idx_av_assessment on public.assessment_validations(assessment_id);
create index idx_av_stage on public.assessment_validations(stage);
create index idx_av_validated_by on public.assessment_validations(validated_by);

-- RLS
alter table public.assessment_validations enable row level security;

-- Les membres de la mission peuvent voir l'historique de validation
create policy "av_select_mission_team"
  on public.assessment_validations for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.mission_members mm on mm.mission_id = ca.mission_id
      join public.users u on u.id = mm.user_id
      where ca.id = assessment_validations.assessment_id
        and u.auth_id = auth.uid()
    )
  );

-- Le client peut voir les validations de ses controles
create policy "av_select_client"
  on public.assessment_validations for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      join public.users u on u.organization_id = m.client_id
      where ca.id = assessment_validations.assessment_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- INSERT reserve au service_role (les validations passent par le backend)
