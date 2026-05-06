-- Migration: interview_matrix (UP)
-- Description: Phase C de la refonte des Entretiens.
--
-- Remplace le modele "interview_schedules.control_ids[] + contact_id" par 2
-- tables M:N orientees matrice acteurs x sujets :
--   * interview_topics : un entretien couvre N sujets (audit_topics)
--   * interview_actors : un entretien rassemble N acteurs (client_contacts)
--
-- Migration des donnees existantes (option (i) full migration) :
--   * control_ids[] -> interview_topics via topic_controls (un control peut
--     mapper a plusieurs sujets ; on prend tous ceux qui le couvrent)
--   * contact_id -> interview_actors (1 acteur par entretien existant)
--
-- Apres backfill, les colonnes legacy sont supprimees.

-- ============================================================
-- 1. interview_topics (M:N entretien <-> sujet)
-- ============================================================

create table public.interview_topics (
  interview_id uuid not null references public.interview_schedules(id) on delete cascade,
  topic_id uuid not null references public.audit_topics(id) on delete cascade,
  primary key (interview_id, topic_id)
);

comment on table public.interview_topics is 'M:N : sujets couverts par un entretien.';

create index idx_interview_topics_topic on public.interview_topics(topic_id);

alter table public.interview_topics enable row level security;

create policy "interview_topics_select"
  on public.interview_topics for select
  to authenticated
  using (
    interview_id in (
      select id from public.interview_schedules
      where mission_id in (select public.get_my_mission_ids())
    )
  );

create policy "interview_topics_insert"
  on public.interview_topics for insert
  to authenticated
  with check (
    interview_id in (
      select id from public.interview_schedules
      where mission_id in (select public.get_my_mission_ids())
    )
  );

create policy "interview_topics_delete"
  on public.interview_topics for delete
  to authenticated
  using (
    interview_id in (
      select id from public.interview_schedules
      where mission_id in (select public.get_my_mission_ids())
    )
  );

-- ============================================================
-- 2. interview_actors (M:N entretien <-> acteur client)
-- ============================================================

create table public.interview_actors (
  interview_id uuid not null references public.interview_schedules(id) on delete cascade,
  actor_id uuid not null references public.client_contacts(id) on delete cascade,
  primary key (interview_id, actor_id)
);

comment on table public.interview_actors is 'M:N : acteurs client convoques a un entretien.';

create index idx_interview_actors_actor on public.interview_actors(actor_id);

alter table public.interview_actors enable row level security;

create policy "interview_actors_select"
  on public.interview_actors for select
  to authenticated
  using (
    interview_id in (
      select id from public.interview_schedules
      where mission_id in (select public.get_my_mission_ids())
    )
  );

create policy "interview_actors_insert"
  on public.interview_actors for insert
  to authenticated
  with check (
    interview_id in (
      select id from public.interview_schedules
      where mission_id in (select public.get_my_mission_ids())
    )
  );

create policy "interview_actors_delete"
  on public.interview_actors for delete
  to authenticated
  using (
    interview_id in (
      select id from public.interview_schedules
      where mission_id in (select public.get_my_mission_ids())
    )
  );

-- ============================================================
-- 3. Backfill des donnees existantes
-- ============================================================

-- 3a. interview_topics : pour chaque control_id existant, on insere tous les
-- topics qui couvrent ce control via topic_controls.
insert into public.interview_topics (interview_id, topic_id)
select distinct i.id, tc.topic_id
from public.interview_schedules i
cross join lateral unnest(coalesce(i.control_ids, '{}'::uuid[])) as ctrl_id
join public.topic_controls tc on tc.control_id = ctrl_id;

-- 3b. interview_actors : un seul acteur par entretien (le contact_id existant)
insert into public.interview_actors (interview_id, actor_id)
select id, contact_id
from public.interview_schedules
where contact_id is not null;

-- ============================================================
-- 4. Suppression des colonnes legacy
-- ============================================================

alter table public.interview_schedules drop column control_ids;
alter table public.interview_schedules drop column contact_id;
