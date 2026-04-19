-- Migration: missions (DOWN)

drop trigger if exists trg_missions_updated_at on public.missions;
-- missions_select_team est dans 00013_mission_members_down.sql
drop policy if exists "missions_select_cabinet" on public.missions;
drop policy if exists "missions_select_client" on public.missions;
drop policy if exists "missions_update_lead_associate" on public.missions;
drop table if exists public.missions cascade;
drop type if exists public.mission_status;
