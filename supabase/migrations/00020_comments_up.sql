-- Migration: comments (UP)
-- Description: Interactions/commentaires sur une mission ou un controle

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  assessment_id uuid references public.control_assessments(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.comments is 'Commentaires sur une mission ou un controle specifique';
comment on column public.comments.assessment_id is 'Nullable: si null, commentaire global mission';

-- Index
create index idx_comments_mission on public.comments(mission_id);
create index idx_comments_assessment on public.comments(assessment_id);
create index idx_comments_author on public.comments(author_id);

-- Trigger updated_at
create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.comments enable row level security;

-- Les membres de la mission peuvent voir et ajouter des commentaires
create policy "comments_select_team"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = comments.mission_id
        and u.auth_id = auth.uid()
    )
  );

create policy "comments_insert_team"
  on public.comments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = comments.mission_id
        and u.auth_id = auth.uid()
    )
  );

-- Le client peut voir et ajouter des commentaires
create policy "comments_select_client"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = comments.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

create policy "comments_insert_client"
  on public.comments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = comments.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

-- L'auteur peut modifier son propre commentaire
create policy "comments_update_author"
  on public.comments for update
  to authenticated
  using (
    author_id in (select id from public.users where auth_id = auth.uid())
  )
  with check (
    author_id in (select id from public.users where auth_id = auth.uid())
  );
