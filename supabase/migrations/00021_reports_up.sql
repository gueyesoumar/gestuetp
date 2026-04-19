-- Migration: reports (UP)
-- Description: Rapports generes (PDF / PowerPoint), plusieurs versions par mission

create type public.report_format as enum (
  'pdf',
  'pptx'
);

create type public.report_status as enum (
  'generating',
  'ready',
  'error'
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  format public.report_format not null,
  status public.report_status not null default 'generating',
  version integer not null default 1,
  file_path text,
  generated_by uuid references public.users(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.reports is 'Rapports generes, plusieurs versions possibles par mission';
comment on column public.reports.file_path is 'Chemin dans Supabase Storage';

-- Index
create index idx_reports_mission on public.reports(mission_id);

-- RLS
alter table public.reports enable row level security;

-- Les membres de la mission peuvent voir les rapports
create policy "reports_select_team"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = reports.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- Le client peut voir les rapports de ses missions
create policy "reports_select_client"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = reports.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
        and reports.status = 'ready'
    )
  );

-- INSERT reserve au service_role (generation via backend)
