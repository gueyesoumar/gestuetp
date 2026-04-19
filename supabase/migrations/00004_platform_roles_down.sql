-- Migration: platform_roles (DOWN)

drop trigger if exists trg_platform_roles_updated_at on public.platform_roles;
drop policy if exists "platform_roles_select_org_members" on public.platform_roles;
drop table if exists public.platform_roles cascade;
