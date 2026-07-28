-- 00149 — Ancrage externe du journal probant (reco audit consultant #3).
-- CIBLE: regul
--
-- Deux renforcements de la valeur probante :
-- (A) Faille TRUNCATE : le trigger de garde (00138) est BEFORE UPDATE/DELETE FOR EACH
--     ROW → il NE couvre PAS TRUNCATE (opération niveau-instruction). On ajoute un
--     trigger BEFORE TRUNCATE. (Un superutilisateur pourrait encore désactiver un
--     trigger ; mais service_role n'est pas propriétaire → protection réelle.)
-- (B) Scellement externe : table probative_seals qui enregistre chaque « sceau »
--     (tête de chaîne figée). L'Edge Function probative-seal émet ce sceau vers un
--     témoin externe (email/tiers) — hors de portée d'un admin DB → une réécriture
--     complète de la chaîne devient détectable en comparant DB ↔ sceau externe.

-- (A) Interdire TRUNCATE sur le journal
create or replace function public.probative_no_truncate()
returns trigger language plpgsql as $$
begin
  raise exception 'Table append-only à valeur probante : TRUNCATE interdit';
end $$;

drop trigger if exists trg_probative_no_truncate on public.probative_log;
create trigger trg_probative_no_truncate
  before truncate on public.probative_log
  for each statement execute function public.probative_no_truncate();

-- (B) Registre des sceaux
create table if not exists public.probative_seals (
  id uuid primary key default gen_random_uuid(),
  sealed_at timestamptz not null default now(),
  seq_head bigint not null,        -- dernier seq scellé (0 si chaîne vide)
  entry_count bigint not null,     -- nombre d'entrées au moment du sceau
  head_hash text not null,         -- hash de tête ('' si chaîne vide)
  chain_ok boolean not null,       -- résultat de verify_probative_chain()
  broken_seq bigint,               -- 1er point de rupture éventuel
  emitted_to text,                 -- destinataire externe (si émis)
  external_ack text,               -- accusé/référence externe (rempli a posteriori)
  created_at timestamptz not null default now()
);

comment on table public.probative_seals is
  'Sceaux périodiques de la tête du journal probant, émis vers un témoin externe (ancrage). Append-only.';

create index if not exists idx_probative_seals_sealed_at on public.probative_seals(sealed_at desc);

-- Append-only : réutilise la garde UPDATE/DELETE de 00138 + interdiction TRUNCATE.
drop trigger if exists trg_seals_guard on public.probative_seals;
create trigger trg_seals_guard
  before update or delete on public.probative_seals
  for each row execute function public.probative_log_guard();

drop trigger if exists trg_seals_no_truncate on public.probative_seals;
create trigger trg_seals_no_truncate
  before truncate on public.probative_seals
  for each statement execute function public.probative_no_truncate();

-- RLS : lecture staff régulateur (jamais client) ; écriture service_role (edge fn).
alter table public.probative_seals enable row level security;
create policy "probative_seals_select_staff"
  on public.probative_seals for select to authenticated
  using (public.is_platform_owner() or not public.is_client_role());
