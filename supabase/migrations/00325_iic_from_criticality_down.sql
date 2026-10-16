-- Rollback 00325 : revient à l'état 00324 (colonne is_iic + RPC lisant o.is_iic).
alter table public.organizations add column if not exists is_iic boolean not null default false;

create or replace function public.get_supervised_org_portfolio()
returns table (
  organization_id uuid, org_name text, sector text, is_iic boolean,
  scenario_count int, above_threshold int, overdue_reviews int,
  avg_exposure int, max_exposure int, pending_directives int)
language sql stable security definer set search_path = '' as $$
  with sup as (select g as id from public.get_my_supervised_org_ids() g),
  agg as (
    select rs.organization_id,
      count(*)::int as scenario_count,
      coalesce(sum(case when round((rs.inherent_likelihood * rs.inherent_impact)::numeric / 16 * 100)
        > coalesce(rc.acceptance_threshold, 60) then 1 else 0 end), 0)::int as above_threshold,
      coalesce(sum(case when rs.next_review_at is not null and rs.next_review_at < current_date
        then 1 else 0 end), 0)::int as overdue_reviews,
      coalesce(round(avg((rs.inherent_likelihood * rs.inherent_impact)::numeric / 16 * 100)), 0)::int as avg_exposure,
      coalesce(max(round((rs.inherent_likelihood * rs.inherent_impact)::numeric / 16 * 100)), 0)::int as max_exposure
    from public.risk_scenarios rs
    left join public.risk_criteria rc on rc.organization_id = rs.organization_id
    where rs.organization_id in (select id from sup)
    group by rs.organization_id
  ),
  dir as (
    select organization_id, count(*)::int as pending_directives
    from public.risk_treatment_actions
    where origin = 'supervisor_directive' and requested_by = public.get_my_user_id() and verification_status = 'pending'
    group by organization_id
  )
  select o.id, o.name, o.sector, o.is_iic,
    coalesce(a.scenario_count, 0), coalesce(a.above_threshold, 0), coalesce(a.overdue_reviews, 0),
    coalesce(a.avg_exposure, 0), coalesce(a.max_exposure, 0), coalesce(d.pending_directives, 0)
  from sup s join public.organizations o on o.id = s.id
  left join agg a on a.organization_id = o.id
  left join dir d on d.organization_id = o.id
  order by coalesce(a.max_exposure, 0) desc, o.name;
$$;
revoke all on function public.get_supervised_org_portfolio() from public;
grant execute on function public.get_supervised_org_portfolio() to authenticated;

create or replace function public.get_supervised_risks(p_org_id uuid default null)
returns table (
  id uuid, organization_id uuid, org_name text, org_sector text, org_is_iic boolean,
  title text, dimension text,
  inherent_likelihood int, inherent_impact int, treatment text,
  lifecycle_status text, next_review_at date,
  threat_ref uuid, feared_event_ref uuid, vulnerability text, asset_name text)
language sql stable security definer set search_path = '' as $$
  select rs.id, rs.organization_id, o.name, o.sector, o.is_iic,
    rs.title, rs.dimension::text,
    rs.inherent_likelihood, rs.inherent_impact, rs.treatment,
    rs.lifecycle_status::text, rs.next_review_at,
    rs.threat_ref, rs.feared_event_ref, rs.vulnerability, ra.name
  from public.risk_scenarios rs
  join public.organizations o on o.id = rs.organization_id
  left join public.risk_assets ra on ra.id = rs.asset_id
  where (p_org_id is null or rs.organization_id = p_org_id)
    and rs.organization_id in (select public.get_my_supervised_org_ids())
  order by o.name, (rs.inherent_likelihood * rs.inherent_impact) desc, rs.title;
$$;
revoke all on function public.get_supervised_risks(uuid) from public;
grant execute on function public.get_supervised_risks(uuid) to authenticated;

create or replace function public.get_supervised_plan()
returns table (
  id uuid, organization_id uuid, org_name text, org_sector text, org_is_iic boolean,
  risk_scenario_id uuid, scenario_title text,
  description text, control_code text, option text, origin text,
  due_date date, status text, verification_status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.organization_id, o.name, o.sector, o.is_iic,
    a.risk_scenario_id, rs.title,
    a.description, c.code, a.option, a.origin,
    a.due_date, a.status, a.verification_status, a.created_at
  from public.risk_treatment_actions a
  join public.organizations o on o.id = a.organization_id
  left join public.risk_scenarios rs on rs.id = a.risk_scenario_id
  left join public.controls c on c.id = a.control_id
  where a.organization_id in (select public.get_my_supervised_org_ids())
  order by o.name, a.due_date asc nulls last, a.created_at desc;
$$;
revoke all on function public.get_supervised_plan() from public;
grant execute on function public.get_supervised_plan() to authenticated;
