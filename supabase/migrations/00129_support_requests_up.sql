-- 00129 — Module Centre d'aide : table unifiee des demandes de support (Phase 0).
-- Modele STI : une table, un discriminateur `nature`, colonnes typees pour le commun
-- + `context` JSONB pour le variable (trace de repro, params de demande, contexte auto-capte).
-- La table enfant `agent_runs` (Phases 3-4) sera ajoutee dans une migration ulterieure.

-- 1. Types
create type support_nature as enum ('bug', 'demande', 'suggestion');
create type support_status as enum ('open', 'in_progress', 'answered', 'escalated', 'resolved', 'closed');

-- 2. Table
create table public.support_requests (
  id                uuid primary key default gen_random_uuid(),
  nature            support_nature not null,
  subtype           text,                                    -- 'password_reset','feature_activation'... (null pour bug/suggestion)
  status            support_status not null default 'open',
  title             text not null,
  body              text,
  requester_user_id uuid not null references public.users(id) on delete cascade,
  cabinet_id        uuid not null references public.organizations(id) on delete cascade,
  mission_id        uuid references public.missions(id) on delete set null,
  role_at_submit    text,                                    -- 'client' | 'auditor' | 'admin' au moment du depot
  context           jsonb not null default '{}'::jsonb,      -- variable : trace, contexte auto-capte, params de demande
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index support_requests_cabinet_status_idx on public.support_requests (cabinet_id, status);
create index support_requests_nature_idx on public.support_requests (nature);
create index support_requests_mission_idx on public.support_requests (mission_id);

comment on table public.support_requests is 'Centre d''aide : bugs, demandes et suggestions (modele STI). Cloisonne par cabinet via RLS.';

-- 3. Trigger updated_at (reutilise le helper existant)
create trigger trg_support_requests_updated_at
  before update on public.support_requests
  for each row execute function public.set_updated_at();

-- 4. Helper SECURITY DEFINER pour le platform owner (la colonne existe deja, mig. 00067)
create or replace function public.is_platform_owner()
  returns boolean
  language sql
  security definer
  set search_path = public
  stable
as $$
  select coalesce((select is_platform_owner from public.users where id = public.get_my_user_id()), false)
$$;

-- 5. RLS — cloisonnement cabinet, sans recursion (aucune sous-requete sur support_requests)
alter table public.support_requests enable row level security;

-- Lecture : platform owner, OU membre du cabinet, OU client de la mission concernee
create policy support_requests_select on public.support_requests
  for select
  using (
    public.is_platform_owner()
    or cabinet_id = public.get_my_organization_id()
    or mission_id in (select public.get_my_mission_ids())
  );

-- Insertion : l'utilisateur cree pour son propre contexte (son cabinet ou une de ses missions)
create policy support_requests_insert on public.support_requests
  for insert
  with check (
    requester_user_id = public.get_my_user_id()
    and (
      cabinet_id = public.get_my_organization_id()
      or mission_id in (select public.get_my_mission_ids())
    )
  );

-- Mise a jour : platform owner (traitement) ou le demandeur (ex: cloturer, completer)
create policy support_requests_update on public.support_requests
  for update
  using (
    public.is_platform_owner()
    or requester_user_id = public.get_my_user_id()
  );

-- Suppression : platform owner uniquement
create policy support_requests_delete on public.support_requests
  for delete
  using (public.is_platform_owner());
