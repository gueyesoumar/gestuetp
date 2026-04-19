-- Migration: tenant_configs (DOWN)

drop trigger if exists trg_tenant_configs_updated_at on public.tenant_configs;
drop policy if exists "tenant_configs_select_authenticated" on public.tenant_configs;
-- tenant_configs_update_members est dans 00006_rls_policies_down.sql
drop table if exists public.tenant_configs cascade;
