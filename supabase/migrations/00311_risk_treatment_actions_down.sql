-- Rollback 00311.
drop policy if exists "rta_aal2" on public.risk_treatment_actions;
drop policy if exists "rta_org" on public.risk_treatment_actions;
drop table if exists public.risk_treatment_actions;
