-- Migration 00255 (UP) — Journal d'événements de mission (RFC UX Lot 5)
--
-- Événements horodatés de la boucle Revue interne → Validation client → Correction :
-- envoi au client, renvoi en correction, validation/rejet client. Alimente la
-- timeline d'envoi (onglet Validation client), le motif de renvoi affiché à
-- l'auditeur en Travaux, et le suivi côté client.
--
-- Append-only par convention : les insertions passent par les edge functions
-- (service_role). Aucune policy INSERT pour les utilisateurs authentifiés.
-- Lecture : équipe de la mission + côté client (calqué sur assessment_validations).

create table public.mission_status_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (event_type in (
    'sent_to_client', 'returned_to_fieldwork', 'client_validated', 'client_rejected'
  )),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_label text,
  reason text,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.mission_status_events is 'Événements horodatés de la boucle revue/validation client d''une mission (RFC UX Lot 5)';

create index idx_mse_mission on public.mission_status_events(mission_id, created_at desc);

alter table public.mission_status_events enable row level security;

-- Équipe de la mission
create policy "mse_select_mission_team"
  on public.mission_status_events for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = mission_status_events.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- Côté client de la mission
create policy "mse_select_client"
  on public.mission_status_events for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = mission_status_events.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- INSERT réservé au service_role (les événements passent par les edge functions).
