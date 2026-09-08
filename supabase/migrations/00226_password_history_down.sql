-- Migration 00226 (DOWN) — retrait rotation/historique (Phase 2).

drop trigger if exists trg_grandfather_password_rotation on public.platform_password_policy;
drop function if exists public.grandfather_password_rotation();
drop table if exists public.password_history;
