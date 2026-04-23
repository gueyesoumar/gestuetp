-- Migration: platform_roles CRUD policies (DOWN)
DROP POLICY IF EXISTS "platform_roles_insert_org_members" ON public.platform_roles;
DROP POLICY IF EXISTS "platform_roles_update_org_members" ON public.platform_roles;
DROP POLICY IF EXISTS "platform_roles_delete_org_members" ON public.platform_roles;
