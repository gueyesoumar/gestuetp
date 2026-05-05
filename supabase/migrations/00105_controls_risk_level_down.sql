-- Migration: controls_risk_level (DOWN)

drop index if exists public.idx_controls_risk_level;

alter table public.controls drop constraint if exists controls_risk_level_check;
alter table public.controls drop column if exists risk_level;
