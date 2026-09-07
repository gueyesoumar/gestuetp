-- Migration: nom d'auteur denormalise sur support_messages (DOWN)

drop trigger if exists trg_support_message_author on public.support_messages;
drop function if exists public.set_support_message_author_name();
alter table public.support_messages drop column if exists author_name;
