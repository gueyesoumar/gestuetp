-- Migration: Table notifications (UP)

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Notifications utilisateur (contrôles soumis, rejets, réponses, etc.)';
comment on column public.notifications.type is 'submission, approval, rejection, client_response, mission_closure, invitation';
comment on column public.notifications.link is 'URL relative pour naviguer vers le contexte (ex: /missions/uuid)';
comment on column public.notifications.metadata is 'Données complémentaires (mission_id, assessment_id, etc.)';

create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_user_unread on public.notifications(user_id) where is_read = false;
create index idx_notifications_created on public.notifications(created_at desc);

-- RLS
alter table public.notifications enable row level security;

-- Un utilisateur ne voit que ses propres notifications
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = public.get_my_user_id());

-- Un utilisateur peut marquer ses notifications comme lues
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = public.get_my_user_id())
  with check (user_id = public.get_my_user_id());

-- INSERT réservé au service_role (les Edge Functions créent les notifications)
