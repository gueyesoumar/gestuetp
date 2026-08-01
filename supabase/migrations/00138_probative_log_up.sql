-- 00138 — Gëstu Regul (S1) : traçabilité à valeur probante.
--
-- Journal APPEND-ONLY chaîné par hash (SHA-256) : chaque entrée intègre le hash
-- de la précédente (prev_hash). Toute altération/suppression casse la chaîne et
-- est détectée par verify_probative_chain(). Hash calculé côté base (fonctions
-- IMMUTABLE partagées entre le trigger d'insertion et la vérification -> une
-- seule source de vérité). sha256() est une fonction cœur PostgreSQL (>= PG11).
--
-- Écriture : service_role uniquement (aucune policy INSERT pour authenticated).
-- UPDATE/DELETE : bloqués par trigger (défense en profondeur, même service_role).
-- Additive et NEUTRE côté Comply (table inutilisée en mode comply).

-- Représentation canonique déterministe (UTC, ordre de clés jsonb normalisé).
create or replace function public.probative_canonical(
  p_seq bigint, p_occurred timestamptz, p_actor uuid, p_action text,
  p_subject_type text, p_subject_id uuid, p_payload jsonb, p_prev text
) returns text
language sql immutable
set search_path = public
as $$
  select p_seq::text || '|'
    || to_char(p_occurred at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|'
    || coalesce(p_actor::text, '') || '|'
    || p_action || '|'
    || coalesce(p_subject_type, '') || '|'
    || coalesce(p_subject_id::text, '') || '|'
    || coalesce(p_payload::text, '{}') || '|'
    || p_prev;
$$;

create or replace function public.probative_hash(p_canonical text)
returns text
language sql immutable
set search_path = public
as $$
  select encode(sha256(convert_to(p_canonical, 'UTF8')), 'hex');
$$;

create table if not exists public.probative_log (
  id uuid primary key default gen_random_uuid(),
  seq bigint not null unique,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references public.users(id) on delete set null,
  action_type text not null,
  subject_type text,
  subject_id uuid,
  payload jsonb not null default '{}',
  prev_hash text not null,
  hash text not null unique
);

comment on table public.probative_log is
  'Gëstu Regul (S1) : journal append-only chaîné par hash, valeur probante. Écriture service_role ; UPDATE/DELETE bloqués.';

create index if not exists idx_probative_seq on public.probative_log(seq);
create index if not exists idx_probative_subject on public.probative_log(subject_type, subject_id);

-- Trigger d'insertion : calcule seq, prev_hash, hash (autorité base).
create or replace function public.probative_log_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_prev text; v_seq bigint;
begin
  select seq, hash into v_seq, v_prev
  from public.probative_log order by seq desc limit 1;
  new.seq := coalesce(v_seq, 0) + 1;
  new.prev_hash := coalesce(v_prev, '');
  new.occurred_at := coalesce(new.occurred_at, now());
  new.hash := public.probative_hash(public.probative_canonical(
    new.seq, new.occurred_at, new.actor_user_id, new.action_type,
    new.subject_type, new.subject_id, new.payload, new.prev_hash));
  return new;
end $$;

create trigger trg_probative_before_insert
  before insert on public.probative_log
  for each row execute function public.probative_log_before_insert();

-- Trigger anti-falsification : append-only strict.
create or replace function public.probative_log_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'probative_log est append-only : aucune modification ni suppression autorisée';
end $$;

create trigger trg_probative_guard
  before update or delete on public.probative_log
  for each row execute function public.probative_log_guard();

-- Vérification d'intégrité : rejoue la chaîne, renvoie le 1er point de rupture.
create or replace function public.verify_probative_chain()
returns table(ok boolean, checked bigint, broken_seq bigint)
language plpgsql
security definer
set search_path = public
as $$
declare r record; v_prev text := ''; v_expected text; v_count bigint := 0;
begin
  for r in select * from public.probative_log order by seq asc loop
    v_count := v_count + 1;
    if r.prev_hash <> v_prev then
      ok := false; checked := v_count; broken_seq := r.seq; return next; return;
    end if;
    v_expected := public.probative_hash(public.probative_canonical(
      r.seq, r.occurred_at, r.actor_user_id, r.action_type,
      r.subject_type, r.subject_id, r.payload, r.prev_hash));
    if v_expected <> r.hash then
      ok := false; checked := v_count; broken_seq := r.seq; return next; return;
    end if;
    v_prev := r.hash;
  end loop;
  ok := true; checked := v_count; broken_seq := null; return next;
end $$;

grant execute on function public.verify_probative_chain() to authenticated;

-- RLS : lecture réservée au staff régulateur (jamais un rôle client).
alter table public.probative_log enable row level security;
create policy "probative_log_select_staff"
  on public.probative_log for select to authenticated
  using (not public.is_client_role());
