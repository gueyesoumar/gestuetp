-- 00178 — DOWN : suppression de la piste d'audit activity_log.

drop policy if exists "activity_log_require_aal2" on public.activity_log;
drop policy if exists "activity_log_select_org" on public.activity_log;

drop trigger if exists trg_activity_no_truncate on public.activity_log;
drop trigger if exists trg_activity_guard on public.activity_log;
drop trigger if exists trg_activity_before_insert on public.activity_log;

drop function if exists public.verify_activity_chain(uuid);
drop function if exists public.activity_log_guard();
drop function if exists public.activity_log_before_insert();

drop table if exists public.activity_log;

drop function if exists public.activity_hash(text);
drop function if exists public.activity_canonical(bigint, timestamptz, uuid, uuid, text, text, text, uuid, text, text, jsonb, text, text);
