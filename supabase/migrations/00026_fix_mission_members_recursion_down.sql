-- Migration: Fix recursion sur mission_members (DOWN)

drop function if exists public.get_my_mission_ids();

select 'Rollback 00026: restaurer les policies depuis 00023' as notice;
