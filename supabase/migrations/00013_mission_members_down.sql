-- Migration: mission_members (DOWN)

-- Policy differee depuis 00012
drop policy if exists "missions_select_team" on public.missions;

drop policy if exists "mission_members_select_team" on public.mission_members;
drop policy if exists "mission_members_select_cabinet" on public.mission_members;
drop table if exists public.mission_members cascade;
drop type if exists public.mission_role;
