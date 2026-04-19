-- Migration: missions (UP)
-- Description: Missions d'audit/conformite. Lie cabinet, client, referentiel.

create type public.mission_status as enum (
  'initialization',
  'scoping',
  'planning',
  'fieldwork',
  'internal_review',
  'client_review',
  'closure'
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null references public.organizations(id) on delete restrict,
  framework_id uuid not null references public.frameworks(id) on delete restrict,
  name text not null,
  description text,
  status public.mission_status not null default 'initialization',
  lead_auditor_id uuid references public.users(id) on delete set null,
  associate_id uuid references public.users(id) on delete set null,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.missions is 'Mission d''audit. Lie un cabinet, un client et un referentiel.';
comment on column public.missions.lead_auditor_id is 'Chef de mission';
comment on column public.missions.associate_id is 'Associe validateur ultime';
comment on column public.missions.status is 'Phase courante du workflow (7 phases)';

-- Index
create index idx_missions_cabinet on public.missions(cabinet_id);
create index idx_missions_client on public.missions(client_id);
create index idx_missions_framework on public.missions(framework_id);
create index idx_missions_status on public.missions(status);
create index idx_missions_lead on public.missions(lead_auditor_id);

-- Trigger updated_at
create trigger trg_missions_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.missions enable row level security;

-- missions_select_team depend de mission_members → dans 00013

-- Les membres du cabinet peuvent voir les missions de leur cabinet
create policy "missions_select_cabinet"
  on public.missions for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = missions.cabinet_id
        and u.is_active = true
    )
  );

-- Les membres du client peuvent voir les missions qui les concernent
create policy "missions_select_client"
  on public.missions for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = missions.client_id
        and u.is_active = true
    )
  );

-- UPDATE reserve au chef de mission et a l'associe
create policy "missions_update_lead_associate"
  on public.missions for update
  to authenticated
  using (
    lead_auditor_id in (select id from public.users where auth_id = auth.uid())
    or associate_id in (select id from public.users where auth_id = auth.uid())
  )
  with check (
    lead_auditor_id in (select id from public.users where auth_id = auth.uid())
    or associate_id in (select id from public.users where auth_id = auth.uid())
  );

-- INSERT reserve au service_role (creation via backend)
