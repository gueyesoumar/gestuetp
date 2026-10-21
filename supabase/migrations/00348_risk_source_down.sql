-- 00348 (DOWN) - retire la source du risque et restaure get_supervised_risks (version 00325).
drop function if exists public.get_supervised_risks(uuid);
create or replace function public.get_supervised_risks(p_org_id uuid default null)
returns table (
  id uuid, organization_id uuid, org_name text, org_sector text, org_is_iic boolean,
  title text, dimension text,
  inherent_likelihood int, inherent_impact int, treatment text,
  lifecycle_status text, next_review_at date,
  threat_ref uuid, feared_event_ref uuid, vulnerability text, asset_name text)
language sql stable security definer set search_path = '' as $$
  select rs.id, rs.organization_id, o.name, o.sector, (coalesce(erp.criticality, 'standard') = 'eleve'),
    rs.title, rs.dimension::text,
    rs.inherent_likelihood, rs.inherent_impact, rs.treatment,
    rs.lifecycle_status::text, rs.next_review_at,
    rs.threat_ref, rs.feared_event_ref, rs.vulnerability, ra.name
  from public.risk_scenarios rs
  join public.organizations o on o.id = rs.organization_id
  left join public.entity_regulatory_profile erp on erp.organization_id = o.id
  left join public.risk_assets ra on ra.id = rs.asset_id
  where (p_org_id is null or rs.organization_id = p_org_id)
    and rs.organization_id in (select public.get_my_supervised_org_ids())
  order by o.name, (rs.inherent_likelihood * rs.inherent_impact) desc, rs.title;
$$;
revoke all on function public.get_supervised_risks(uuid) from public;
grant execute on function public.get_supervised_risks(uuid) to authenticated;

drop trigger if exists trg_risk_scenario_set_source on public.risk_scenarios;
drop function if exists public.risk_scenario_set_source();
alter table public.risk_scenarios drop column if exists source;
