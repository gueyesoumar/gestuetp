-- Rollback 00313.
drop trigger if exists trg_rcl_delete_supersede on public.risk_control_links;
drop trigger if exists trg_incident_link_supersede on public.incident_risk_links;
drop trigger if exists trg_rs_cotation_supersede on public.risk_scenarios;
drop function if exists public.trg_rcl_delete_supersede();
drop function if exists public.trg_incident_link_supersede();
drop function if exists public.trg_rs_cotation_supersede();
drop function if exists public.supersede_risk_acceptances(uuid);
drop function if exists public.risk_acceptance_after_insert() cascade;
drop function if exists public.risk_acceptance_before_insert() cascade;

drop policy if exists "ra_aal2" on public.risk_acceptances;
drop policy if exists "ra_write" on public.risk_acceptances;
drop policy if exists "ra_select" on public.risk_acceptances;
drop table if exists public.risk_acceptances;

update public.platform_roles
set permissions = permissions - 'can_accept_risk';
