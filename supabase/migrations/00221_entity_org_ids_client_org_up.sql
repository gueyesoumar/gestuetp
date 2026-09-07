-- Migration 00221 (UP) — P2.2b correctif (RFC 0007) : get_my_entity_org_ids lisait
-- encore cpc.entity_org_id (retiré en 00220) → my_capabilities / my_vocab /
-- get_my_supervisor_org / inc_select_assujetti tombaient en 400. Bascule sur la
-- colonne unifiée client_org_id (l'assujetti/le client = la même org auditée).

create or replace function public.get_my_entity_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cpc.client_org_id
  from public.client_portal_contacts cpc
  where cpc.user_id = public.get_my_user_id()
    and cpc.client_org_id is not null;
$$;
