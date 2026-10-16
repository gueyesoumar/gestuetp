-- Rollback 00321.
drop trigger if exists trg_rsn_seed on public.risk_scenarios;
drop function if exists public.risk_scenario_seed_nodes();
