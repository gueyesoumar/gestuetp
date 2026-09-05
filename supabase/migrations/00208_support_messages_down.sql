-- Migration: fil de conversation sur les tickets support (DOWN)

drop trigger if exists trg_support_message_insert on public.support_messages;
drop function if exists public.on_support_message_insert();
drop table if exists public.support_messages;
