-- Rollback 00135 : restaure la policy SELECT ouverte sur organizations et retire
-- les helpers ajoutes. ATTENTION : réintroduit l'énumération cross-tenant des orgs.

drop policy if exists "organizations_select_scoped" on public.organizations;
create policy "organizations_select_authenticated"
  on public.organizations for select
  to authenticated
  using (is_active = true);

drop function if exists public.get_my_client_visible_org_ids();
drop function if exists public.get_my_client_org_ids();
drop function if exists public.get_my_parent_org_id();
