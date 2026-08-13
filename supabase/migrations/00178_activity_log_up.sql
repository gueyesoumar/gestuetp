-- 00178 — Piste d'audit (F6) : journal d'activité opérationnel, org-scoped.
--
-- Journal APPEND-ONLY chaîné par hash (SHA-256), CHAÎNE PAR ORGANISATION :
-- chaque entrée intègre le hash de la précédente de LA MÊME org (prev_hash).
-- Le chaînage par-org (verrou advisory par organization_id) évite la contention
-- qu'aurait une chaîne globale sous forte volumétrie. Toute altération/suppression
-- casse la chaîne et est détectée par verify_activity_chain(org).
--
-- Écriture : service_role / SECURITY DEFINER uniquement (le trigger générique
-- log_activity_change() en mig C, et le helper edge logActivity). Aucune policy
-- INSERT pour authenticated. UPDATE/DELETE/TRUNCATE bloqués par trigger.
-- Distinct de probative_log (registre scellé Regul), qu'il agrège seulement en
-- lecture côté UI.

-- Représentation canonique déterministe (UTC, ordre stable).
create or replace function public.activity_canonical(
  p_seq bigint, p_occurred timestamptz, p_org uuid, p_actor uuid, p_actor_label text,
  p_action text, p_target_type text, p_target_id uuid, p_target_label text,
  p_summary text, p_metadata jsonb, p_source text, p_prev text
) returns text
language sql immutable
set search_path = public
as $$
  select p_seq::text || '|'
    || to_char(p_occurred at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|'
    || p_org::text || '|'
    || coalesce(p_actor::text, '') || '|'
    || coalesce(p_actor_label, '') || '|'
    || p_action || '|'
    || coalesce(p_target_type, '') || '|'
    || coalesce(p_target_id::text, '') || '|'
    || coalesce(p_target_label, '') || '|'
    || coalesce(p_summary, '') || '|'
    || coalesce(p_metadata::text, '{}') || '|'
    || coalesce(p_source, '') || '|'
    || p_prev;
$$;

create or replace function public.activity_hash(p_canonical text)
returns text
language sql immutable
set search_path = public
as $$
  select encode(sha256(convert_to(p_canonical, 'UTF8')), 'hex');
$$;

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_label text,
  action text not null,
  target_type text,
  target_id uuid,
  target_label text,
  summary text,
  metadata jsonb not null default '{}',
  source text not null default 'trigger' check (source in ('trigger', 'edge', 'system')),
  -- Chaînage cryptographique PAR ORGANISATION
  seq bigint not null,
  prev_hash text not null,
  hash text not null,
  unique (organization_id, seq),
  unique (organization_id, hash)
);

comment on table public.activity_log is
  'Piste d''audit opérationnelle org-scoped : append-only chaîné par hash (chaîne par organisation). Écriture service_role/SECURITY DEFINER ; UPDATE/DELETE/TRUNCATE bloqués.';

create index if not exists idx_activity_org_time on public.activity_log(organization_id, occurred_at desc);
create index if not exists idx_activity_target on public.activity_log(target_type, target_id);
create index if not exists idx_activity_action on public.activity_log(organization_id, action);
create index if not exists idx_activity_actor on public.activity_log(actor_user_id);

-- Trigger d'insertion : verrou par-org, calcule seq/prev_hash/hash (autorité base).
create or replace function public.activity_log_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_prev text; v_seq bigint;
begin
  -- Sérialise les inserts de CETTE organisation (pas les autres).
  perform pg_advisory_xact_lock(hashtext('activity_log:' || new.organization_id::text));
  select seq, hash into v_seq, v_prev
  from public.activity_log
  where organization_id = new.organization_id
  order by seq desc limit 1;
  new.seq := coalesce(v_seq, 0) + 1;
  new.prev_hash := coalesce(v_prev, '');
  new.occurred_at := coalesce(new.occurred_at, now());
  new.hash := public.activity_hash(public.activity_canonical(
    new.seq, new.occurred_at, new.organization_id, new.actor_user_id, new.actor_label,
    new.action, new.target_type, new.target_id, new.target_label,
    new.summary, new.metadata, new.source, new.prev_hash));
  return new;
end $$;

create trigger trg_activity_before_insert
  before insert on public.activity_log
  for each row execute function public.activity_log_before_insert();

-- Trigger anti-falsification : append-only strict (UPDATE/DELETE + TRUNCATE).
create or replace function public.activity_log_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'activity_log est append-only : aucune modification ni suppression autorisée';
end $$;

create trigger trg_activity_guard
  before update or delete on public.activity_log
  for each row execute function public.activity_log_guard();

create trigger trg_activity_no_truncate
  before truncate on public.activity_log
  for each statement execute function public.activity_log_guard();

-- Vérification d'intégrité : rejoue la chaîne d'UNE organisation.
create or replace function public.verify_activity_chain(p_org uuid)
returns table(ok boolean, checked bigint, broken_seq bigint)
language plpgsql
security definer
set search_path = public
as $$
declare r record; v_prev text := ''; v_expected text; v_count bigint := 0;
begin
  for r in select * from public.activity_log where organization_id = p_org order by seq asc loop
    v_count := v_count + 1;
    if r.prev_hash <> v_prev then
      ok := false; checked := v_count; broken_seq := r.seq; return next; return;
    end if;
    v_expected := public.activity_hash(public.activity_canonical(
      r.seq, r.occurred_at, r.organization_id, r.actor_user_id, r.actor_label,
      r.action, r.target_type, r.target_id, r.target_label,
      r.summary, r.metadata, r.source, r.prev_hash));
    if v_expected <> r.hash then
      ok := false; checked := v_count; broken_seq := r.seq; return next; return;
    end if;
    v_prev := r.hash;
  end loop;
  ok := true; checked := v_count; broken_seq := null; return next;
end $$;

-- Vérification réservée au service_role (pas exposée aux clients).
revoke execute on function public.verify_activity_chain(uuid) from public;
grant execute on function public.verify_activity_chain(uuid) to service_role;

-- RLS : lecture cloisonnée à sa propre organisation ET permission dédiée.
alter table public.activity_log enable row level security;

create policy "activity_log_select_org"
  on public.activity_log for select to authenticated
  using (
    public.is_platform_owner()
    or (
      organization_id = public.get_my_organization_id()
      and public.user_has_cabinet_permission(public.get_my_user_id(), 'can_view_audit_trail')
    )
  );

-- Standard plateforme : session MFA (AAL2) requise pour toucher la table (aligné 00173).
create policy "activity_log_require_aal2"
  on public.activity_log as restrictive for all to authenticated
  using (public.is_aal2());
