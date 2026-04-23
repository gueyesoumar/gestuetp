-- Migration: platform_roles CRUD policies (UP)
-- Description: Permettre aux membres de l'organisation de gérer les rôles

-- INSERT: les membres actifs peuvent créer des rôles dans leur organisation
CREATE POLICY "platform_roles_insert_org_members"
  ON public.platform_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_my_organization_id()
  );

-- UPDATE: les membres actifs peuvent modifier les rôles de leur organisation
CREATE POLICY "platform_roles_update_org_members"
  ON public.platform_roles FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
  );

-- DELETE: les membres actifs peuvent supprimer les rôles de leur organisation
CREATE POLICY "platform_roles_delete_org_members"
  ON public.platform_roles FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
  );
