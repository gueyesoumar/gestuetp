-- Migration: platform_roles_policy_cleanup (DOWN)
-- Recrée les policies redondantes `*_can_manage_roles` (gatées) supprimées en UP.
-- Elles font doublon avec `*_org_members` (00170) — recréation à l'identique
-- (org + can_manage_roles) pour réversibilité, sans changement de sécurité.

create policy "platform_roles_insert_can_manage_roles"
  on public.platform_roles for insert to authenticated
  with check (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_roles'));

create policy "platform_roles_update_can_manage_roles"
  on public.platform_roles for update to authenticated
  using (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_roles'))
  with check (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_roles'));

create policy "platform_roles_delete_can_manage_roles"
  on public.platform_roles for delete to authenticated
  using (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_roles'));
