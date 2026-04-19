-- Migration: mission_control_assignments (DOWN)

drop policy if exists "mca_select_team" on public.mission_control_assignments;
drop table if exists public.mission_control_assignments cascade;
