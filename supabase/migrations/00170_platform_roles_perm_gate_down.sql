-- Migration: platform_roles_perm_gate (DOWN)
-- ATTENTION : rétablit l'état VULNÉRABLE (écriture des rôles par tout membre de
-- l'org sans can_manage_roles -> auto-escalade des permissions). Rollback restaure
-- les policies org-seul de 00052.

drop policy if exists "platform_roles_insert_org_members" on public.platform_roles;
create policy "platform_roles_insert_org_members"
  on public.platform_roles for insert to authenticated
  with check (organization_id = public.get_my_organization_id());

drop policy if exists "platform_roles_update_org_members" on public.platform_roles;
create policy "platform_roles_update_org_members"
  on public.platform_roles for update to authenticated
  using (organization_id = public.get_my_organization_id());

drop policy if exists "platform_roles_delete_org_members" on public.platform_roles;
create policy "platform_roles_delete_org_members"
  on public.platform_roles for delete to authenticated
  using (organization_id = public.get_my_organization_id());
