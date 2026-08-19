-- Migration 00201 (DOWN) : rollback plans-bundles (RFC 0006, Phase 2, D)
--
-- Sans risque : tables dormantes (aucun lecteur runtime avant P4), le système de
-- flags techniques plan_features(plan_id,flag_id) n'a jamais été touché.

drop policy if exists plan_bundle_features_select_all on public.plan_bundle_features;
drop policy if exists plan_products_select_all on public.plan_products;

drop table if exists public.plan_bundle_features;
drop table if exists public.plan_products;

alter table public.plans drop column if exists home_product;
