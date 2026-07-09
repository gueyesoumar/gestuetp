-- 00145 — Gëstu Regul (M5-2) : corrige le scope assujetti des incidents.
--
-- inc_select_assujetti (00144) s'appuyait sur get_my_organization_id(), NEUTRALISÉ
-- pour les role=client par le durcissement anti-fuite (00134) → renvoie NULL →
-- l'assujetti ne voyait AUCUN incident (même les siens). On scope désormais via
-- client_portal_contacts.entity_org_id, le scope canonique de l'assujetti (M7),
-- résolu par une fonction SECURITY DEFINER (pas de récursion, non neutralisée).

-- Org(s) assujettie(s) auxquelles le contact courant est rattaché.
create or replace function public.get_my_entity_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cpc.entity_org_id
  from public.client_portal_contacts cpc
  where cpc.user_id = public.get_my_user_id()
    and cpc.entity_org_id is not null;
$$;

comment on function public.get_my_entity_org_ids() is
  'SECURITY DEFINER — org(s) assujettie(s) du contact courant (entity_org_id). Scope client Regul, non neutralisé par 00134.';

-- Recrée la policy avec le bon scope.
drop policy if exists "inc_select_assujetti" on public.incidents;
create policy "inc_select_assujetti"
  on public.incidents for select
  to authenticated
  using (
    public.is_client_role()
    and entity_id in (select public.get_my_entity_org_ids())
  );
