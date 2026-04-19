-- Migration: documents (UP)
-- Description: Fichiers uploades (preuves, documents client)

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  assessment_id uuid references public.control_assessments(id) on delete set null,
  uploaded_by uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.documents is 'Fichiers uploades lies a une mission ou a un controle';
comment on column public.documents.assessment_id is 'Nullable: si null, document global mission';
comment on column public.documents.file_path is 'Chemin dans Supabase Storage';

-- Index
create index idx_documents_mission on public.documents(mission_id);
create index idx_documents_assessment on public.documents(assessment_id);
create index idx_documents_uploaded_by on public.documents(uploaded_by);

-- RLS
alter table public.documents enable row level security;

-- Les membres de la mission peuvent voir les documents
create policy "documents_select_team"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = documents.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- Le client peut voir et uploader des documents
create policy "documents_select_client"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = documents.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

create policy "documents_insert_client"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = documents.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- Les membres de la mission peuvent uploader des documents
create policy "documents_insert_team"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = documents.mission_id
        and u.auth_id = auth.uid()
    )
  );
