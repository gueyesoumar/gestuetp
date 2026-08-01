-- Migration: control_comments (UP)
-- Description: Discussion feature pour le workspace Phase 4. Permet aux auditeurs et chefs
-- de mission de commenter / mentionner sur un controle specifique. Affichage dans l'onglet
-- Discussion du right rail (cf handoff-6-phase4-workspace.html).
--
-- Champs :
--   - mission_id + control_id : portee du commentaire
--   - author_id : utilisateur qui a poste
--   - parent_id : reply (thread imbrique 1 niveau)
--   - text : contenu (5000 chars max)
--   - mentioned_user_ids : tableau d'IDs mentionnes via @nom (futur : declenche notif)
--   - deleted_at : soft delete (preserve l'audit trail)
--
-- RLS : membres de la mission peuvent SELECT et INSERT, auteur peut UPDATE/DELETE le sien.

create table public.control_comments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.control_comments(id) on delete cascade,
  text text not null check (length(text) > 0 and length(text) <= 5000),
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.control_comments is
  'Commentaires/discussion sur un controle d''une mission (workspace Phase 4 right rail Discussion tab).';
comment on column public.control_comments.parent_id is
  'Reference au commentaire parent pour les replies. Limite a 1 niveau d''imbrication cote UI.';
comment on column public.control_comments.mentioned_user_ids is
  'Utilisateurs mentionnes via @nom dans le texte. Utilise pour les notifications futures.';
comment on column public.control_comments.deleted_at is
  'Soft delete : commentaire masque cote UI mais preserve pour audit trail.';

create index idx_control_comments_lookup on public.control_comments(mission_id, control_id, created_at desc);
create index idx_control_comments_author on public.control_comments(author_id);
create index idx_control_comments_parent on public.control_comments(parent_id) where parent_id is not null;

create trigger trg_control_comments_updated_at
  before update on public.control_comments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.control_comments enable row level security;

-- 1. Membres de la mission peuvent voir tous les commentaires non supprimes
create policy "control_comments_select_members"
  on public.control_comments for select
  to authenticated
  using (
    deleted_at is null
    and mission_id in (select public.get_my_mission_ids())
  );

-- 2. Membres peuvent inserter un commentaire (auteur = utilisateur courant)
create policy "control_comments_insert_members"
  on public.control_comments for insert
  to authenticated
  with check (
    mission_id in (select public.get_my_mission_ids())
    and author_id = public.get_my_user_id()
  );

-- 3. Auteur peut update son propre commentaire
create policy "control_comments_update_own"
  on public.control_comments for update
  to authenticated
  using (author_id = public.get_my_user_id())
  with check (author_id = public.get_my_user_id());

-- 4. Auteur peut delete (soft) son propre commentaire — passe par UPDATE deleted_at
--    en pratique le UPDATE policy ci-dessus suffit. Pas de DELETE direct autorise.
