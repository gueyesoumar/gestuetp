-- Rollback 00309.
drop policy if exists "risk_criteria_aal2" on public.risk_criteria;
drop policy if exists "risk_criteria_write" on public.risk_criteria;
drop policy if exists "risk_criteria_select" on public.risk_criteria;
drop table if exists public.risk_criteria;

update public.platform_roles
set permissions = permissions - 'can_manage_risk_criteria';
