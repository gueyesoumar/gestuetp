-- Migration: client_contacts (UP)
-- Description: Interlocuteurs client pour la planification des entretiens

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  name text not null,
  job_title text,
  department text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.client_contacts is 'Interlocuteurs côté client pour les entretiens d''audit';

create index idx_cc_mission on public.client_contacts(mission_id);

alter table public.client_contacts enable row level security;

create policy "cc_select_team"
  on public.client_contacts for select
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));

create policy "cc_insert_team"
  on public.client_contacts for insert
  to authenticated
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "cc_update_team"
  on public.client_contacts for update
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()))
  with check (mission_id in (select public.get_my_mission_ids()));

create policy "cc_delete_team"
  on public.client_contacts for delete
  to authenticated
  using (mission_id in (select public.get_my_mission_ids()));
