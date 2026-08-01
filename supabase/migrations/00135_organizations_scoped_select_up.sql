-- 00135 — Durcissement RLS organizations : remplace la policy SELECT ouverte
-- (USING is_active = true, lisible par tout authentifie -> enumeration des noms
-- d'orgs cross-tenant) par une policy scopee au périmètre légitime de l'appelant.
--
-- Périmètre visible :
--   * staff : sa propre org, le parent (groupe), ses filiales, et les orgs CLIENTES
--     de son cabinet (pour afficher les noms clients dans les missions) ;
--   * client portail : le(s) cabinet(s) qui le servent + sa propre org cliente
--     (pour le branding / "audité par X" du portail) — necessaire car depuis 00134
--     get_my_organization_id() est NULL pour un client ;
--   * platform owner : tout (policy organizations_select_platform_owner, 00067).
-- Helpers SECURITY DEFINER -> pas de recursion (ils n'appliquent pas la RLS de
-- organizations / cabinet_clients qu'ils interrogent).

-- Helper : org parente de mon org (groupe). NULL pour un client (org_id NULL).
create or replace function public.get_my_parent_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select parent_org_id
  from public.organizations
  where id = public.get_my_organization_id()
    and parent_org_id is not null;
$$;

-- Helper (staff) : les orgs clientes de mon cabinet.
create or replace function public.get_my_client_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_org_id
  from public.cabinet_clients
  where cabinet_id = public.get_my_organization_id();
$$;

-- Helper (client portail) : le(s) cabinet(s) qui me servent + ma propre org cliente.
create or replace function public.get_my_client_visible_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cc.cabinet_id
  from public.cabinet_clients cc
  join public.client_portal_contacts cpc on cpc.cabinet_client_id = cc.id
  where cpc.user_id = public.get_my_user_id()
  union
  select cc.client_org_id
  from public.cabinet_clients cc
  join public.client_portal_contacts cpc on cpc.cabinet_client_id = cc.id
  where cpc.user_id = public.get_my_user_id();
$$;

-- Policy SELECT scopee (remplace organizations_select_authenticated).
drop policy if exists "organizations_select_authenticated" on public.organizations;
create policy "organizations_select_scoped"
  on public.organizations for select
  to authenticated
  using (
    id = public.get_my_organization_id()
    or id = public.get_my_parent_org_id()
    or id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
    or id in (select public.get_my_client_org_ids())
    or id in (select public.get_my_client_visible_org_ids())
  );
