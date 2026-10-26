-- RFC n°17 Lot 4 : préférences in-app de notifications (opt-out par type).
-- Une ligne par utilisateur ; muted_types = types qu'il ne veut PAS recevoir in-app.
-- Absence de ligne = rien de masqué (tout délivré). Le helper _shared/notify.ts
-- retire les destinataires ayant masqué le type. admin_view / support ne passent
-- pas par ce helper et restent toujours délivrés.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  muted_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy notification_preferences_select_own on public.notification_preferences
  for select using (user_id = get_my_user_id());
create policy notification_preferences_insert_own on public.notification_preferences
  for insert with check (user_id = get_my_user_id());
create policy notification_preferences_update_own on public.notification_preferences
  for update using (user_id = get_my_user_id()) with check (user_id = get_my_user_id());
