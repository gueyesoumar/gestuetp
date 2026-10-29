-- 00370 (UP) - RFC 0024 Lot 1 : agrégats pour le rapport de supervision nationale.
--
-- Deux RPC SECURITY DEFINER qui agrègent, sur le PÉRIMÈTRE SUPERVISÉ de l'appelant
-- (get_my_supervised_org_ids, qui porte déjà les gardes AAL2 + non-client, fail-closed),
-- les données des volets Regul et Risk pour un rapport destiné au plus haut niveau de l'État.
-- Gardes re-déclarées dans le corps (SECURITY DEFINER contourne la RLS) + permission dédiée.
--
-- Notes de réalité (vérifiées) :
--  - Le score de conformité n'est PAS persisté (close-mission le calcule à la volée). On le
--    RECALCULE ici avec la même formule : c=100, lc=75, pc=50, nc=0 ; na/null exclus ;
--    sur les missions status='closure' des assujettis supervisés (posture courante).
--  - Les paliers de mesures sont regulatory_measures.measure_type
--    (recommandation / mise_en_demeure / injonction / sanction).
--  - Pas de champ "thème" structuré sur les constats -> on remonte les "top contrôles en écart".
--  - Exposition = round(vraisemblance * impact / 16 * 100), comme get_supervised_org_portfolio.

-- Permission dédiée (RFC 0024 D3) : accordée aux rôles déjà habilités à la supervision /
-- à la piste d'audit. Backfill (patron 00347) + gabarit admin-create-cabinet.
update public.platform_roles
set permissions = permissions || jsonb_build_object(
  'can_generate_national_report',
  coalesce((permissions ->> 'can_manage_supervision_assignments')::boolean, false)
  or coalesce((permissions ->> 'can_view_audit_trail')::boolean, false)
)
where not (permissions ? 'can_generate_national_report');

-- ====================== VOLET REGUL ======================
create or replace function public.get_national_regul_summary(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from date := coalesce(p_from, date '2000-01-01');
  v_to date := coalesce(p_to, current_date);
begin
  if not public.is_aal2() or public.is_client_role()
     or not public.has_cabinet_permission('can_generate_national_report') then
    raise exception 'not authorized';
  end if;

  return (
    with sup as (select g as id from public.get_my_supervised_org_ids() g),
    orgs as (
      select o.id, o.sector,
             (coalesce(erp.criticality, 'standard') = 'eleve') as is_iic
      from public.organizations o
      left join public.entity_regulatory_profile erp on erp.organization_id = o.id
      where o.id in (select id from sup)
    ),
    conf as (
      select m.client_id, m.framework_id,
             avg(case ca.conformity_level
                   when 'c' then 100 when 'lc' then 75 when 'pc' then 50 when 'nc' then 0 end) as score
      from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      where m.client_id in (select id from sup)
        and m.status = 'closure'
        and ca.conformity_level in ('c', 'lc', 'pc', 'nc')
      group by m.id, m.client_id, m.framework_id
    )
    select jsonb_build_object(
      'period', jsonb_build_object('from', v_from, 'to', v_to),
      'perimeter', jsonb_build_object(
        'assujettis', (select count(*) from sup),
        'vitales', (select count(*) from orgs where is_iic)),
      'conformity', jsonb_build_object(
        'overall', (select coalesce(round(avg(score)), 0)::int from conf),
        'by_sector', (select coalesce(jsonb_agg(x order by (x->>'value')::int), '[]'::jsonb) from (
            select jsonb_build_object('sector', coalesce(o.sector, 'Autre'),
                   'value', round(avg(c.score))::int, 'count', count(distinct c.client_id)) x
            from conf c join public.organizations o on o.id = c.client_id
            group by o.sector) q),
        'by_referential', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
            select jsonb_build_object('referentiel', f.name, 'value', round(avg(c.score))::int) x
            from conf c join public.frameworks f on f.id = c.framework_id
            group by f.name) q)),
      'findings', jsonb_build_object(
        'by_classification', (select coalesce(jsonb_object_agg(classification, n), '{}'::jsonb) from (
            select af.classification, count(*) n
            from public.assessment_findings af
            join public.control_assessments ca on ca.id = af.assessment_id
            join public.missions m on m.id = ca.mission_id
            where m.client_id in (select id from sup)
              and af.created_at::date between v_from and v_to
            group by af.classification) q),
        'top_controls', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
            select jsonb_build_object('control_code', co.code, 'control_name', co.name, 'count', count(*)) x
            from public.assessment_findings af
            join public.control_assessments ca on ca.id = af.assessment_id
            join public.missions m on m.id = ca.mission_id
            join public.controls co on co.id = ca.control_id
            where m.client_id in (select id from sup)
              and af.classification in ('major_nc', 'minor_nc')
              and af.created_at::date between v_from and v_to
            group by co.code, co.name
            order by count(*) desc limit 5) q)),
      'measures', (
        select jsonb_build_object(
          'by_type', coalesce(jsonb_object_agg(measure_type, n), '{}'::jsonb),
          'total', coalesce(sum(n), 0),
          'closed', coalesce(sum(nclosed), 0))
        from (
          select rm.measure_type, count(*) n,
                 count(*) filter (where rm.status in ('resolved', 'closed')) nclosed
          from public.regulatory_measures rm
          where rm.entity_id in (select id from sup)
            and coalesce(rm.issued_at, rm.created_at)::date between v_from and v_to
          group by rm.measure_type) q),
      'actions', (
        select jsonb_build_object(
          'total', count(*),
          'closed', count(*) filter (where c.status = 'closed'),
          'overdue', count(*) filter (where c.status <> 'closed' and c.deadline is not null and c.deadline < current_date))
        from public.corrective_action_requests c
        join public.missions m on m.id = c.mission_id
        where m.client_id in (select id from sup)
          and c.created_at::date between v_from and v_to),
      'audit_trail', jsonb_build_object(
        'events', (select count(*) from public.activity_log al
          where al.organization_id in (select id from sup)
            and al.occurred_at::date between v_from and v_to))
    )
  );
end $$;
revoke all on function public.get_national_regul_summary(date, date) from public;
grant execute on function public.get_national_regul_summary(date, date) to authenticated;

-- ====================== VOLET RISK ======================
create or replace function public.get_national_risk_summary(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from date := coalesce(p_from, date '2000-01-01');
  v_to date := coalesce(p_to, current_date);
begin
  if not public.is_aal2() or public.is_client_role()
     or not public.has_cabinet_permission('can_generate_national_report') then
    raise exception 'not authorized';
  end if;

  return (
    with sup as (select g as id from public.get_my_supervised_org_ids() g),
    orgs as (
      select o.id, o.sector, o.name,
             (coalesce(erp.criticality, 'standard') = 'eleve') as is_iic
      from public.organizations o
      left join public.entity_regulatory_profile erp on erp.organization_id = o.id
      where o.id in (select id from sup)
    ),
    sc as (
      select rs.id, rs.organization_id, rs.title, rs.dimension::text as dimension,
             rs.treatment_status, rs.next_review_at,
             o.sector, o.name as org_name, o.is_iic,
             round((rs.inherent_likelihood * rs.inherent_impact)::numeric / 16 * 100)::int as expo
      from public.risk_scenarios rs
      join orgs o on o.id = rs.organization_id
    ),
    org_expo as (
      select organization_id, max(is_iic::int) as iic, round(avg(expo))::int as avg_expo
      from sc group by organization_id
    )
    select jsonb_build_object(
      'period', jsonb_build_object('from', v_from, 'to', v_to),
      'exposure', jsonb_build_object(
        'national_avg', (select coalesce(round(avg(avg_expo)), 0)::int from org_expo),
        'max', (select coalesce(max(expo), 0) from sc),
        'by_sector', (select coalesce(jsonb_agg(x order by (x->>'avg')::int desc), '[]'::jsonb) from (
            select jsonb_build_object('sector', coalesce(sector, 'Autre'),
                   'avg', round(avg(expo))::int, 'max', max(expo)) x
            from sc group by sector) q),
        'zones', jsonb_build_object(
          'critique', (select count(*) from org_expo where avg_expo >= 60),
          'surveillance', (select count(*) from org_expo where avg_expo >= 30 and avg_expo < 60),
          'maitrise', (select count(*) from org_expo where avg_expo < 30),
          'non_evalue', (select count(*) from sup where id not in (select organization_id from org_expo)))),
      'top_scenarios', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
          select jsonb_build_object('title', title, 'org', org_name,
                 'sector', coalesce(sector, 'Autre'), 'dimension', dimension, 'exposure', expo) x
          from sc order by expo desc, title limit 6) q),
      'vitales', jsonb_build_object(
        'total', (select count(*) from orgs where is_iic),
        'exposed', (select count(*) from org_expo where iic = 1 and avg_expo >= 60),
        'heatmap', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
            select jsonb_build_object('org', org_name, 'dimension', dimension, 'exposure', max(expo)) x
            from sc where is_iic group by org_name, dimension order by org_name limit 16) q)),
      'treatment', jsonb_build_object(
        'active_plans', (select count(*) from sc where treatment_status in ('open', 'in_progress')),
        'acceptances', (select count(*) from public.risk_acceptances ra
          where ra.organization_id in (select id from sup) and ra.status = 'active'),
        'derogations', (select count(*) from public.risk_acceptances ra
          where ra.organization_id in (select id from sup) and ra.status = 'active' and ra.is_derogation),
        'overdue_reviews', (select count(*) from sc where next_review_at is not null and next_review_at < current_date))
    )
  );
end $$;
revoke all on function public.get_national_risk_summary(date, date) from public;
grant execute on function public.get_national_risk_summary(date, date) to authenticated;

do $$
declare v_granted int;
begin
  select count(*) into v_granted from public.platform_roles where (permissions ->> 'can_generate_national_report')::boolean;
  raise notice '[00370] platform_roles avec can_generate_national_report=true : %', v_granted;
end $$;
