-- Migration 00152 (DOWN) : rollback du cloisonnement tenant_configs
-- Restaure la policy SELECT permissive d'origine (état 00002).

drop policy if exists "tenant_configs_select_own_org" on public.tenant_configs;

create policy "tenant_configs_select_authenticated"
  on public.tenant_configs for select
  to authenticated
  using (true);
