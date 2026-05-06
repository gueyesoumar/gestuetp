-- Migration: questionnaire_collab (UP)
-- Description: Sprint 2 du questionnaire — collaboration auditeur/client.
--
-- 1. Table questionnaire_response_comments : thread de commentaires par
--    question (auditeur peut demander une clarification, client peut repondre).
--    Modele identique a control_comments (cf migrations 00103 + 00104).
--
-- 2. questionnaire_responses.entered_by_auditor : flag indiquant que la reponse
--    a ete saisie par l'auditeur (mode interview) plutot que par le client.
--    Permet d'afficher un badge specifique cote auditeur.
--
-- 3. Policies RLS questionnaire_responses : autoriser les membres de mission
--    a INSERT/UPDATE pour le mode interview.

-- 1. Comments par question
create table public.questionnaire_response_comments (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.questionnaire_instances(id) on delete cascade,
  question_code text not null,
  author_id uuid references public.users(id) on delete set null,
  parent_id uuid references public.questionnaire_response_comments(id) on delete cascade,
  text text not null check (length(text) > 0 and length(text) <= 5000),
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.questionnaire_response_comments is
  'Thread de commentaires sur une question du questionnaire (auditeur ↔ client).';
comment on column public.questionnaire_response_comments.author_id is
  'Auteur. NULL si user supprime (preserve audit trail).';
comment on column public.questionnaire_response_comments.parent_id is
  'Reference au commentaire parent pour les replies (1 niveau imbrique cote UI).';
comment on column public.questionnaire_response_comments.deleted_at is
  'Soft delete : commentaire masque mais preserve.';

create index idx_qr_comments_lookup
  on public.questionnaire_response_comments(instance_id, question_code, created_at desc);
create index idx_qr_comments_author
  on public.questionnaire_response_comments(author_id);
create index idx_qr_comments_parent
  on public.questionnaire_response_comments(parent_id) where parent_id is not null;

create trigger trg_qr_comments_updated_at
  before update on public.questionnaire_response_comments
  for each row execute function public.set_updated_at();

-- Trigger anti-resurrection (meme pattern que control_comments)
create or replace function public.prevent_qr_comment_resurrection()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'Cannot resurrect a soft-deleted comment'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_qr_comments_prevent_resurrection
  before update on public.questionnaire_response_comments
  for each row execute function public.prevent_qr_comment_resurrection();

-- RLS questionnaire_response_comments
alter table public.questionnaire_response_comments enable row level security;

-- 1a. Membres de la mission voient les comments non supprimes
create policy "qrc_select_team"
  on public.questionnaire_response_comments for select
  to authenticated
  using (
    deleted_at is null
    and instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_mission_ids())
    )
  );

-- 1b. Client portail voit les comments de ses missions
create policy "qrc_select_client"
  on public.questionnaire_response_comments for select
  to authenticated
  using (
    deleted_at is null
    and public.is_client_role()
    and instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_client_mission_ids())
    )
  );

-- 2a. Membre de la mission peut INSERT (auteur = self)
create policy "qrc_insert_team"
  on public.questionnaire_response_comments for insert
  to authenticated
  with check (
    instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_mission_ids())
    )
    and author_id = public.get_my_user_id()
  );

-- 2b. Client portail peut INSERT (auteur = self)
create policy "qrc_insert_client"
  on public.questionnaire_response_comments for insert
  to authenticated
  with check (
    public.is_client_role()
    and instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_client_mission_ids())
    )
    and author_id = public.get_my_user_id()
  );

-- 3. Auteur peut UPDATE son propre comment
create policy "qrc_update_own"
  on public.questionnaire_response_comments for update
  to authenticated
  using (author_id = public.get_my_user_id())
  with check (author_id = public.get_my_user_id());

-- 4. entered_by_auditor flag sur la reponse
alter table public.questionnaire_responses
  add column entered_by_auditor boolean not null default false;

comment on column public.questionnaire_responses.entered_by_auditor is
  'TRUE si la reponse a ete saisie par un membre de la mission (mode interview) plutot que par le client.';

-- 5. Autoriser les membres de mission a INSERT/UPDATE les responses (mode interview)
create policy "qr_insert_team"
  on public.questionnaire_responses for insert
  to authenticated
  with check (
    instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_mission_ids())
    )
    and responded_by = public.get_my_user_id()
  );

create policy "qr_update_team"
  on public.questionnaire_responses for update
  to authenticated
  using (
    instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_mission_ids())
    )
  )
  with check (
    instance_id in (
      select qi.id from public.questionnaire_instances qi
      where qi.mission_id in (select public.get_my_mission_ids())
    )
  );
