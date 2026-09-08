-- Migration 00226 (UP) — Phase 2 politique mot de passe : rotation + historique.
-- rotation_days / history_count existent déjà (00225). Ici : la table d'historique
-- (hashes bcrypt, surface sensible → service_role UNIQUEMENT) et le trigger de
-- « grandfathering » qui démarre l'horloge de rotation à l'activation.

create table if not exists public.password_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_password_history_user
  on public.password_history(user_id, created_at desc);

comment on table public.password_history is
  'Hashes bcrypt des N derniers mots de passe (non-réutilisation). Accès service_role UNIQUEMENT — RLS activé sans aucune policy, et grants révoqués pour anon/authenticated.';

-- Sécurité : RLS activé SANS aucune policy → deny total pour anon/authenticated.
-- service_role contourne RLS (lecture/écriture par les edges). Révocation explicite
-- des grants en défense en profondeur (au cas où les default privileges les auraient posés).
alter table public.password_history enable row level security;
revoke all on public.password_history from anon, authenticated;

-- Grandfathering : à l'activation de la rotation (rotation_days null -> valeur),
-- démarrer l'horloge pour les comptes sans date, afin de ne verrouiller personne.
create or replace function public.grandfather_password_rotation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rotation_days is not null and old.rotation_days is null then
    update public.users set password_changed_at = now() where password_changed_at is null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_grandfather_password_rotation on public.platform_password_policy;
create trigger trg_grandfather_password_rotation
  after update of rotation_days on public.platform_password_policy
  for each row execute function public.grandfather_password_rotation();
