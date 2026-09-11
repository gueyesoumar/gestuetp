-- Migration 00237 (DOWN)

DROP POLICY IF EXISTS "user_platform_roles_select_platform_owner" ON public.user_platform_roles;
DROP POLICY IF EXISTS "platform_roles_select_platform_owner" ON public.platform_roles;
