-- Migration 00152 (UP) : cloisonnement des lectures tenant_configs
-- Constat audit sécurité #3 (moyen) : la policy SELECT de tenant_configs
-- était `using (true)`, laissant tout compte authenticated (y compris
-- role=client) énumérer la config marque blanche de TOUTES les organisations
-- (domaines custom, portefeuille cabinets/clients).
-- La table n'est lue par aucun code frontend ; le theming public passe par
-- l'Edge Function resolve-tenant-by-hostname en service_role (hors RLS).
-- On restreint donc la lecture à l'organisation de l'appelant.
-- Pour role=client, get_my_organization_id() renvoie NULL (neutralisé en
-- 00134) => aucune ligne, ce qui est le comportement attendu.

drop policy if exists "tenant_configs_select_authenticated" on public.tenant_configs;

create policy "tenant_configs_select_own_org"
  on public.tenant_configs for select
  to authenticated
  using (organization_id = public.get_my_organization_id());
