-- Migration: controls (DOWN)

drop trigger if exists trg_controls_updated_at on public.controls;
drop policy if exists "controls_select_authenticated" on public.controls;
drop table if exists public.controls cascade;
