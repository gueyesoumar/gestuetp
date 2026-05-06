-- Migration: audit_topics (UP)
-- Description: Catalogue de "Sujets d'audit" — meta-themes qui regroupent N
-- controles d'un referentiel (ex: "Gestion des acces" couvre A.5.15-18, A.8.2,
-- A.8.3, A.8.5). Phase A de la refonte des Entretiens.
--
-- Deux portees :
--   * framework_id set, mission_id null : template plateforme (seede)
--   * framework_id null, mission_id set : sujet custom a une mission
--   * exactement une des deux portees est renseignee.
--
-- topic_controls : table M:N entre audit_topics et controls.

-- ============================================================
-- audit_topics
-- ============================================================

create table public.audit_topics (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid references public.frameworks(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audit_topics_one_scope check (
    (framework_id is not null and mission_id is null)
    or (framework_id is null and mission_id is not null)
  )
);

comment on table public.audit_topics is 'Catalogue de sujets d''audit. framework_id non null = template plateforme. mission_id non null = sujet custom mission.';
comment on column public.audit_topics.framework_id is 'Si non null : sujet generique du referentiel. Visible/utilisable par toutes les missions du referentiel.';
comment on column public.audit_topics.mission_id is 'Si non null : sujet specifique a une mission. Visible/editable uniquement par l''equipe de cette mission.';

create unique index idx_audit_topics_framework_name
  on public.audit_topics(framework_id, lower(name))
  where framework_id is not null;

create unique index idx_audit_topics_mission_name
  on public.audit_topics(mission_id, lower(name))
  where mission_id is not null;

create index idx_audit_topics_framework
  on public.audit_topics(framework_id)
  where framework_id is not null;

create index idx_audit_topics_mission
  on public.audit_topics(mission_id)
  where mission_id is not null;

create trigger trg_audit_topics_updated_at
  before update on public.audit_topics
  for each row execute function public.set_updated_at();

alter table public.audit_topics enable row level security;

create policy "audit_topics_select"
  on public.audit_topics for select
  to authenticated
  using (
    framework_id is not null
    or mission_id in (select public.get_my_mission_ids())
  );

create policy "audit_topics_insert"
  on public.audit_topics for insert
  to authenticated
  with check (
    (framework_id is not null and public.is_platform_owner())
    or (mission_id in (select public.get_my_mission_ids()))
  );

create policy "audit_topics_update"
  on public.audit_topics for update
  to authenticated
  using (
    (framework_id is not null and public.is_platform_owner())
    or (mission_id in (select public.get_my_mission_ids()))
  )
  with check (
    (framework_id is not null and public.is_platform_owner())
    or (mission_id in (select public.get_my_mission_ids()))
  );

create policy "audit_topics_delete"
  on public.audit_topics for delete
  to authenticated
  using (
    (framework_id is not null and public.is_platform_owner())
    or (mission_id in (select public.get_my_mission_ids()))
  );

-- ============================================================
-- topic_controls (M:N)
-- ============================================================

create table public.topic_controls (
  topic_id uuid not null references public.audit_topics(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  primary key (topic_id, control_id)
);

comment on table public.topic_controls is 'Mapping M:N : un sujet couvre N controles, un controle peut etre couvert par plusieurs sujets.';

create index idx_topic_controls_control on public.topic_controls(control_id);

alter table public.topic_controls enable row level security;

create policy "topic_controls_select"
  on public.topic_controls for select
  to authenticated
  using (
    topic_id in (
      select id from public.audit_topics
      where framework_id is not null
        or mission_id in (select public.get_my_mission_ids())
    )
  );

create policy "topic_controls_insert"
  on public.topic_controls for insert
  to authenticated
  with check (
    topic_id in (
      select id from public.audit_topics
      where (framework_id is not null and public.is_platform_owner())
        or mission_id in (select public.get_my_mission_ids())
    )
  );

create policy "topic_controls_delete"
  on public.topic_controls for delete
  to authenticated
  using (
    topic_id in (
      select id from public.audit_topics
      where (framework_id is not null and public.is_platform_owner())
        or mission_id in (select public.get_my_mission_ids())
    )
  );
