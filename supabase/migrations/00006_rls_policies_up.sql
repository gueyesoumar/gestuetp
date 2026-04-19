-- Migration: RLS policies dependant de public.users (UP)
-- Description: Policies separees car elles referencent public.users
--              qui doit exister avant leur creation

-- organizations: UPDATE reserve aux membres de l'org
create policy "organizations_update_members"
  on public.organizations for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = organizations.id
        and u.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = organizations.id
        and u.is_active = true
    )
  );

-- tenant_configs: UPDATE reserve aux membres de l'org
create policy "tenant_configs_update_members"
  on public.tenant_configs for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = tenant_configs.organization_id
        and u.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid()
        and u.organization_id = tenant_configs.organization_id
        and u.is_active = true
    )
  );
