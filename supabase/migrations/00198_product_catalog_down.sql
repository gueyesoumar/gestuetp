-- Migration 00198 (DOWN) : rollback du catalogue produits (RFC 0006, Phase 1)
--
-- Aucune dépendance entrante en P1 (catalogue dormant, non consommé par le gating).
-- Le seul consommateur runtime est le Hub (front) via useHubProducts() ; rétablir
-- src/lib/hubProducts.ts (HUB_PRODUCTS) côté front si ce down est appliqué.

drop table if exists public.product_capability;
drop table if exists public.product_features;
drop table if exists public.products;
