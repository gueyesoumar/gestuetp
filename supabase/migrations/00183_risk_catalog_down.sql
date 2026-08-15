-- 00183 — DOWN : suppression du catalogue de risque.
drop policy if exists "risk_catalog_aal2" on public.risk_catalog;
drop policy if exists "risk_catalog_read" on public.risk_catalog;
drop table if exists public.risk_catalog;
