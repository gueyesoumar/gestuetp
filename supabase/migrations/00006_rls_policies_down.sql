-- Migration: RLS policies dependant de public.users (DOWN)

drop policy if exists "organizations_update_members" on public.organizations;
drop policy if exists "tenant_configs_update_members" on public.tenant_configs;
