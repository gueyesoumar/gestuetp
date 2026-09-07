-- Migration 00221 (DOWN) — restaure la version lisant entity_org_id (nécessite que
-- la colonne existe, i.e. 00220 rollé back d'abord).
create or replace function public.get_my_entity_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cpc.entity_org_id
  from public.client_portal_contacts cpc
  where cpc.user_id = public.get_my_user_id()
    and cpc.entity_org_id is not null;
$$;
