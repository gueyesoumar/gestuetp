-- Migration 00067: Flag platform owner sur users (DOWN)

DROP POLICY IF EXISTS "organizations_select_platform_owner" ON public.organizations;
DROP POLICY IF EXISTS "users_select_platform_owner" ON public.users;
DROP FUNCTION IF EXISTS public.is_platform_owner();
ALTER TABLE public.users DROP COLUMN IF EXISTS is_platform_owner;
