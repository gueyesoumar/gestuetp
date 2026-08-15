-- 00188 — rollback : boucle incident → vraisemblance

drop table if exists public.incident_risk_links;

drop policy if exists "inc_select_staff_self" on public.incidents;
