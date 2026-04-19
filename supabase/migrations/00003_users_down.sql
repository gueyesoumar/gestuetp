-- Migration: users (DOWN)

drop trigger if exists trg_users_updated_at on public.users;
drop policy if exists "users_select_self" on public.users;
drop policy if exists "users_select_same_org" on public.users;
drop policy if exists "users_update_self" on public.users;
drop table if exists public.users cascade;
