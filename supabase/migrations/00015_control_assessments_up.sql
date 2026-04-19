-- Migration: control_assessments (UP)
-- Description: Travail effectue sur un controle (constats, recommandations, IA)

create type public.assessment_status as enum (
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected'
);

create table public.control_assessments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  auditor_id uuid not null references public.users(id) on delete cascade,
  status public.assessment_status not null default 'draft',
  findings text,
  recommendations text,
  ai_draft text,
  evidence_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mission_id, control_id)
);

comment on table public.control_assessments is 'Travail d''audit sur un controle';
comment on column public.control_assessments.ai_draft is 'Brouillon genere par IA (assistance redaction constats)';
comment on column public.control_assessments.findings is 'Constats de l''auditeur';

-- Index
create index idx_ca_mission on public.control_assessments(mission_id);
create index idx_ca_auditor on public.control_assessments(auditor_id);
create index idx_ca_status on public.control_assessments(status);

-- Trigger updated_at
create trigger trg_control_assessments_updated_at
  before update on public.control_assessments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.control_assessments enable row level security;

-- L'auditeur affecte peut voir et modifier ses assessments
create policy "ca_select_auditor"
  on public.control_assessments for select
  to authenticated
  using (
    auditor_id in (select id from public.users where auth_id = auth.uid())
  );

create policy "ca_update_auditor"
  on public.control_assessments for update
  to authenticated
  using (
    auditor_id in (select id from public.users where auth_id = auth.uid())
    and status in ('draft', 'rejected')
  )
  with check (
    auditor_id in (select id from public.users where auth_id = auth.uid())
  );

-- Le chef de mission et l'associe peuvent voir tous les assessments de la mission
create policy "ca_select_lead_associate"
  on public.control_assessments for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.auth_id = auth.uid()
      where m.id = control_assessments.mission_id
        and (m.lead_auditor_id = u.id or m.associate_id = u.id)
    )
  );

-- Le client peut voir les assessments approuves en interne
create policy "ca_select_client"
  on public.control_assessments for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = control_assessments.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
        and control_assessments.status in ('approved', 'in_review')
    )
  );
