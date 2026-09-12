-- Migration 00239 (DOWN)
drop index if exists public.idx_rs_demo;
alter table public.risk_scenarios
  drop column if exists is_demo,
  drop column if exists demo_owner_id;
