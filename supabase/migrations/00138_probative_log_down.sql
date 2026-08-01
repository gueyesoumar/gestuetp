-- Rollback 00138 : supprime le journal probant et ses fonctions.
-- ATTENTION : perd la chaîne de traçabilité probante.

drop trigger if exists trg_probative_guard on public.probative_log;
drop trigger if exists trg_probative_before_insert on public.probative_log;
drop table if exists public.probative_log;
drop function if exists public.verify_probative_chain();
drop function if exists public.probative_log_guard();
drop function if exists public.probative_log_before_insert();
drop function if exists public.probative_hash(text);
drop function if exists public.probative_canonical(bigint, timestamptz, uuid, text, text, uuid, jsonb, text);
