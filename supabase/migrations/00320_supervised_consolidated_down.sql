-- Rollback 00320 : retire le plan consolidé et restaure get_supervised_risks (p_org_id requis).
drop function if exists public.get_supervised_plan();

create or replace function public.get_supervised_risks(p_org_id uuid)
returns table (
  id uuid, organization_id uuid, org_name text, title text, dimension text,
  inherent_likelihood int, inherent_impact int, treatment text,
  lifecycle_status text, next_review_at date,
  threat_ref uuid, feared_event_ref uuid, vulnerability text, asset_name text)
language sql stable security definer set search_path = '' as $$
  select rs.id, rs.organization_id, o.name, rs.title, rs.dimension::text,
    rs.inherent_likelihood, rs.inherent_impact, rs.treatment,
    rs.lifecycle_status::text, rs.next_review_at,
    rs.threat_ref, rs.feared_event_ref, rs.vulnerability, ra.name
  from public.risk_scenarios rs
  join public.organizations o on o.id = rs.organization_id
  left join public.risk_assets ra on ra.id = rs.asset_id
  where rs.organization_id = p_org_id
    and rs.organization_id in (select public.get_my_supervised_org_ids())
  order by (rs.inherent_likelihood * rs.inherent_impact) desc, rs.title;
$$;

revoke all on function public.get_supervised_risks(uuid) from public;
grant execute on function public.get_supervised_risks(uuid) to authenticated;
