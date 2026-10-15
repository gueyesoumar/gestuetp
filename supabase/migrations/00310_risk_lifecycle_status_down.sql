-- Rollback 00310.
drop index if exists public.idx_risk_scenarios_lifecycle;
alter table public.risk_scenarios drop column if exists lifecycle_status;
