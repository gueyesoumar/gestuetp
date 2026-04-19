-- Migration: user_platform_roles (DOWN)

drop policy if exists "user_platform_roles_select_self" on public.user_platform_roles;
drop policy if exists "user_platform_roles_select_same_org" on public.user_platform_roles;
drop table if exists public.user_platform_roles cascade;
