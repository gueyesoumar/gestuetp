-- Gëstu Risk : les modèles de scénarios doivent être filtrés par le secteur de
-- l'ASSUJETTI ciblé, pas de l'appelant. Un régulateur n'a pas de secteur, donc
-- l'ancien filtre `me.sector` ne renvoyait que les modèles universels. On ajoute un
-- paramètre p_sector (secteur de l'assujetti choisi) ; null = retombe sur mon secteur
-- (cas assujetti créant pour lui-même). Signature élargie -> on drop d'abord l'ancienne.
drop function if exists public.get_scenario_templates();

create or replace function public.get_scenario_templates(p_sector text default null)
returns table (
  id uuid, owner_org_id uuid, sectors text[], title text, dimension text,
  suggested_likelihood int, suggested_impact int,
  threat_ref uuid, feared_event_ref uuid, vulnerability text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select public.get_my_organization_id() as org,
           (select o.sector from public.organizations o where o.id = public.get_my_organization_id()) as sector
  )
  select t.id, t.owner_org_id, t.sectors, t.title, t.dimension::text,
         t.suggested_likelihood, t.suggested_impact, t.threat_ref, t.feared_event_ref, t.vulnerability
  from public.risk_scenario_templates t, me
  where t.is_active
    and not public.is_client_role()
    and (t.owner_org_id is null
         or t.owner_org_id = me.org
         or t.owner_org_id in (select public.get_my_supervisor_org_ids()))
    and (cardinality(t.sectors) = 0 or coalesce(p_sector, me.sector) = any (t.sectors))
  order by t.title;
$$;
revoke all on function public.get_scenario_templates(text) from public;
grant execute on function public.get_scenario_templates(text) to authenticated;
