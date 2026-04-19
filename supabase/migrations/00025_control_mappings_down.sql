-- Migration: control_mappings (DOWN)

drop policy if exists "control_mappings_select_authenticated" on public.control_mappings;
drop table if exists public.control_mappings cascade;
