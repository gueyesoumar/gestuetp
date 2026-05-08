-- Migration: member_role_sync (DOWN)
-- Rollback de 00119_member_role_sync_up.sql
--
-- Note : le DOWN ne reverse PAS le backfill (les rows réconciliées restent).
-- Il supprime juste les triggers de synchronisation.

drop trigger if exists trg_sync_member_role_to_mission on public.mission_members;
drop trigger if exists trg_sync_lead_associate_to_members on public.missions;

drop function if exists public.sync_member_role_to_mission();
drop function if exists public.sync_lead_associate_to_members();
