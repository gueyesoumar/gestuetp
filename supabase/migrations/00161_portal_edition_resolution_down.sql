-- Migration 00161 (DOWN) : restaure les fonctions 00160 (sans resolution superviseur).

create or replace function public.get_my_edition()
returns text language sql stable security definer set search_path = public as $$
  select o.edition from public.organizations o where o.id = public.get_my_organization_id();
$$;

create or replace function public.my_capabilities()
returns setof public.org_capability language sql stable security definer set search_path = public as $$
  select capability from public.organization_capabilities
  where org_id = public.get_my_organization_id() and status = 'active';
$$;

drop function if exists public.get_my_supervisor_org();
