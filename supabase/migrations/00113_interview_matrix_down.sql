-- Migration: interview_matrix (DOWN)
-- Rollback de 00113_interview_matrix_up.sql
--
-- ATTENTION : la suppression des colonnes legacy est destructive en up. Le
-- down recree control_ids et contact_id puis tente une reconstitution
-- partielle (1 contact_id pris au hasard parmi les actors, control_ids vide
-- car on ne peut plus deriver les controls couverts depuis les topics sans
-- ambiguite). Cette restauration n'est pas exhaustive : a utiliser uniquement
-- en environnement de dev pour annuler la migration.

-- 1. Restaurer les colonnes legacy
alter table public.interview_schedules
  add column control_ids uuid[] not null default '{}'::uuid[],
  add column contact_id uuid references public.client_contacts(id) on delete set null;

comment on column public.interview_schedules.control_ids is 'Contrôles couverts par cet entretien (array de UUIDs)';

-- 2. Reconstituer contact_id (premier acteur)
update public.interview_schedules i
set contact_id = sub.actor_id
from (
  select distinct on (interview_id) interview_id, actor_id
  from public.interview_actors
  order by interview_id, actor_id
) sub
where sub.interview_id = i.id;

-- 3. Drop des nouvelles tables
drop policy if exists "interview_actors_delete" on public.interview_actors;
drop policy if exists "interview_actors_insert" on public.interview_actors;
drop policy if exists "interview_actors_select" on public.interview_actors;
drop table if exists public.interview_actors;

drop policy if exists "interview_topics_delete" on public.interview_topics;
drop policy if exists "interview_topics_insert" on public.interview_topics;
drop policy if exists "interview_topics_select" on public.interview_topics;
drop table if exists public.interview_topics;
