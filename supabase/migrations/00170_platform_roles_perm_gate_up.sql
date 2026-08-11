-- Migration: platform_roles_perm_gate (UP)
-- Sévérité : ÉLEVÉ (audit OWASP 2026-08-11, constat E1 / A01).
--
-- Problème : les policies d'écriture de platform_roles (00052) ne vérifient que
-- l'appartenance à l'organisation, PAS la permission fine can_manage_roles. Or les
-- permissions effectives sont lues via has_cabinet_permission() -> platform_roles.
-- permissions. Un membre bas-privilège porteur d'un rôle pouvait donc s'auto-octroyer
-- des permissions sensibles :
--   update public.platform_roles
--     set permissions = permissions || '{"can_manage_roles":true,"can_manage_members":true}'::jsonb
--   where id = '<son rôle>';
--
-- Correctif : gater INSERT/UPDATE/DELETE par has_cabinet_permission('can_manage_roles')
-- EN PLUS de l'appartenance à l'org. has_cabinet_permission conserve la back-door
-- platform_owner (les super-admins Gëstu gardent la main), et l'admin initial d'un
-- cabinet reçoit can_manage_roles à la création (admin-create-cabinet, service_role).
-- UPDATE reçoit aussi un WITH CHECK pour empêcher de déplacer un rôle vers une autre org.

drop policy if exists "platform_roles_insert_org_members" on public.platform_roles;
create policy "platform_roles_insert_org_members"
  on public.platform_roles for insert
  to authenticated
  with check (
    organization_id = public.get_my_organization_id()
    and public.has_cabinet_permission('can_manage_roles')
  );

drop policy if exists "platform_roles_update_org_members" on public.platform_roles;
create policy "platform_roles_update_org_members"
  on public.platform_roles for update
  to authenticated
  using (
    organization_id = public.get_my_organization_id()
    and public.has_cabinet_permission('can_manage_roles')
  )
  with check (
    organization_id = public.get_my_organization_id()
    and public.has_cabinet_permission('can_manage_roles')
  );

drop policy if exists "platform_roles_delete_org_members" on public.platform_roles;
create policy "platform_roles_delete_org_members"
  on public.platform_roles for delete
  to authenticated
  using (
    organization_id = public.get_my_organization_id()
    and public.has_cabinet_permission('can_manage_roles')
  );
