-- Migration 00223 (DOWN) — restaure les helpers lisant parent_org_id (00136/00135).
create or replace function public.get_subsidiary_ids(parent_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive tree as (
    select id from public.organizations
    where parent_org_id = parent_id and is_active = true
    union
    select o.id from public.organizations o
    join tree t on o.parent_org_id = t.id
    where o.is_active = true
  )
  select id from tree;
$$;

create or replace function public.get_my_parent_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select parent_org_id from public.organizations
  where id = public.get_my_organization_id() and parent_org_id is not null;
$$;
