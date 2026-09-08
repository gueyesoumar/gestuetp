-- Migration 00225 (UP) — Politique de mot de passe pilotable depuis le super-admin.
-- Source de vérité applicative (couche éditable) ; le socle dur (min length + HIBP)
-- reste réglé côté GoTrue (Dashboard). Enforcement serveur : edge `set-password`.
-- Phase 1 : longueur + complexité + interdits/HIBP. Phase 2 : rotation + historique
-- (les colonnes existent déjà mais leur enforcement viendra plus tard).

-- Table singleton (une seule ligne, id = 1).
create table if not exists public.platform_password_policy (
  id             smallint primary key default 1 check (id = 1),
  min_length     smallint not null default 12 check (min_length between 8 and 72),
  require_upper  boolean  not null default true,
  require_lower  boolean  not null default true,
  require_digit  boolean  not null default true,
  require_symbol boolean  not null default false,
  min_unique     smallint not null default 4  check (min_unique between 1 and 72),
  forbid_common  boolean  not null default true,
  check_hibp     boolean  not null default true,
  rotation_days  smallint check (rotation_days is null or rotation_days between 1 and 3650), -- null = désactivé (Phase 2)
  history_count  smallint not null default 0 check (history_count between 0 and 24),         -- 0 = désactivé (Phase 2)
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.users(id) on delete set null
);

comment on table public.platform_password_policy is
  'Politique de mot de passe plateforme (singleton). Éditable par les super-admins, enforced par l''edge set-password. rotation_days/history_count = Phase 2.';

-- Ligne par défaut (défauts alignés best-practice : longueur forte + complexité + HIBP,
-- rotation/historique désactivés par défaut car déconseillés par NIST 800-63B).
insert into public.platform_password_policy (id) values (1) on conflict (id) do nothing;

-- Suivi de la date de dernier changement (support futur de la rotation).
alter table public.users add column if not exists password_changed_at timestamptz;

-- RLS : lecture pour tout utilisateur authentifié (le client a besoin des règles
-- pour l'UX, y compris en AAL1 sur /set-password) ; écriture réservée aux super-admins.
-- Volontairement NON gardée par require_aal2 (doit être lisible avant l'AAL2).
alter table public.platform_password_policy enable row level security;

drop policy if exists "pwpolicy_select" on public.platform_password_policy;
create policy "pwpolicy_select" on public.platform_password_policy
  for select to authenticated using (true);

drop policy if exists "pwpolicy_update" on public.platform_password_policy;
create policy "pwpolicy_update" on public.platform_password_policy
  for update to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());
