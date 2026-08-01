-- Migration 00125: Application des quotas plan-based (DOWN)
-- Rollback de 00125_plan_quota_enforcement_up.sql

DROP TRIGGER IF EXISTS trg_missions_quota ON public.missions;
DROP TRIGGER IF EXISTS trg_users_quota ON public.users;

DROP FUNCTION IF EXISTS public.enforce_mission_quota_trigger();
DROP FUNCTION IF EXISTS public.enforce_user_quota_trigger();

DROP FUNCTION IF EXISTS public.check_mission_quota(uuid);
DROP FUNCTION IF EXISTS public.check_user_quota(uuid);
