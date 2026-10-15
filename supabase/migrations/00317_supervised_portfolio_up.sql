-- 00317 - Gëstu Risk / RFC 0017 Lot C : portefeuille de risque multi-org (superviseur).
--
-- Lecture cross-tenant AGRÉGÉE pour une entité qui supervise/audite plusieurs orgs
-- (Régulateur = supervision, Cabinet = client_portal). Même autorité que
-- get_audited_org_risks (00196) : missions ACTIVES dont l'appelant est membre et
-- dont son org est le cabinet. La RLS des tables risk reste strictement org-scoped ;
-- la lecture cross-org passe UNIQUEMENT par ces RPC SECURITY DEFINER, lecture seule.

-- Helper : org ids supervisés/audités par l'appelant. Gardes AAL2 + non-client
-- DEDANS => set vide si non autorisé, donc tout ce qui en dérive est neutralisé.
create or replace function public.get_my_supervised_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct m.client_id
  from public.missions m
  join public.mission_members mm on mm.mission_id = m.id
  where m.cabinet_id = public.get_my_organization_id()
    and mm.user_id = public.get_my_user_id()
    and m.is_active = true
    and m.client_id is not null
    and public.is_aal2()
    and not public.is_client_role();
$$;

revoke all on function public.get_my_supervised_org_ids() from public;
grant execute on function public.get_my_supervised_org_ids() to authenticated;

-- Portefeuille : 1 ligne par org supervisée (borné par le nombre d'assujettis).
create or replace function public.get_supervised_org_portfolio()
returns table (
  organization_id uuid, org_name text, sector text,
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
    where origin = 'supervisor_directive'
      and requested_by = public.get_my_user_id()
      and verification_status = 'pending'
    group by organization_id
  )
  select o.id, o.name, o.sector,
    coalesce(a.scenario_count, 0), coalesce(a.above_threshold, 0), coalesce(a.overdue_reviews, 0),
    coalesce(a.avg_exposure, 0), coalesce(a.max_exposure, 0), coalesce(d.pending_directives, 0)
  from sup s
  join public.organizations o on o.id = s.id
  left join agg a on a.organization_id = o.id
  left join dir d on d.organization_id = o.id
  order by coalesce(a.max_exposure, 0) desc, o.name;
$$;

revoke all on function public.get_supervised_org_portfolio() from public;
grant execute on function public.get_supervised_org_portfolio() to authenticated;

-- Drill-down : risques d'UNE org supervisée. Exige p_org_id dans le set supervisé.
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
