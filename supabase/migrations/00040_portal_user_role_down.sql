-- Migration: portal_user_role (DOWN)

DROP POLICY IF EXISTS "users_select_same_client_org" ON public.users;
DROP INDEX IF EXISTS idx_users_client_org;
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE public.users DROP COLUMN IF EXISTS client_org_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS role;
