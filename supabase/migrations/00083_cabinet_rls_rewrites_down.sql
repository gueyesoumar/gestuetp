-- Migration 00083: RLS rewrites pour utiliser has_cabinet_permission — DOWN
--
-- Restaure les RLS d'origine (membership cabinet seulement) et retire le
-- trigger anti-bricking.

-- 1. Drop trigger anti-bricking
DROP TRIGGER IF EXISTS trg_prevent_last_admin_demotion ON public.platform_roles;
DROP FUNCTION IF EXISTS public.prevent_last_admin_role_demotion();

-- 2. platform_roles : restore policies de la migration 00052
DROP POLICY IF EXISTS "platform_roles_insert_can_manage_roles" ON public.platform_roles;
DROP POLICY IF EXISTS "platform_roles_update_can_manage_roles" ON public.platform_roles;
DROP POLICY IF EXISTS "platform_roles_delete_can_manage_roles" ON public.platform_roles;

CREATE POLICY "platform_roles_insert_org_members"
  ON public.platform_roles FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_my_organization_id());

CREATE POLICY "platform_roles_update_org_members"
  ON public.platform_roles FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());

CREATE POLICY "platform_roles_delete_org_members"
  ON public.platform_roles FOR DELETE
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

-- 3. cabinet_clients : restore policies d'origine (00028)
DROP POLICY IF EXISTS "cabinet_clients_insert_can_manage" ON public.cabinet_clients;
DROP POLICY IF EXISTS "cabinet_clients_update_can_manage" ON public.cabinet_clients;
DROP POLICY IF EXISTS "cabinet_clients_delete_can_manage" ON public.cabinet_clients;

CREATE POLICY "cabinet_clients_insert_cabinet"
  ON public.cabinet_clients FOR INSERT
  TO authenticated
  WITH CHECK (cabinet_id = public.get_my_organization_id());

CREATE POLICY "cabinet_clients_update_cabinet"
  ON public.cabinet_clients FOR UPDATE
  TO authenticated
  USING (cabinet_id = public.get_my_organization_id())
  WITH CHECK (cabinet_id = public.get_my_organization_id());

CREATE POLICY "cabinet_clients_delete_cabinet"
  ON public.cabinet_clients FOR DELETE
  TO authenticated
  USING (cabinet_id = public.get_my_organization_id());

-- 4. organizations.UPDATE : restore policy d'origine (00006)
DROP POLICY IF EXISTS "organizations_update_can_edit" ON public.organizations;

CREATE POLICY "organizations_update_members"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.organization_id = organizations.id
        AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.organization_id = organizations.id
        AND u.is_active = true
    )
  );
