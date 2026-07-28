-- 00149 (DOWN) — retire l'ancrage externe.
drop trigger if exists trg_seals_no_truncate on public.probative_seals;
drop trigger if exists trg_seals_guard on public.probative_seals;
drop table if exists public.probative_seals cascade;

drop trigger if exists trg_probative_no_truncate on public.probative_log;
drop function if exists public.probative_no_truncate();
