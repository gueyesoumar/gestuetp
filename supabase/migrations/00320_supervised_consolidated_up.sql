-- 00320 - Gëstu Risk / RFC 0017 (Lot H) : Registre & Plan consolidés cross-org.
-- Pour un superviseur (Régulateur / Cabinet), voir les risques ET les actions de
-- traitement de TOUS ses assujettis en une liste, avec la colonne assujetti.
-- Même autorité et même sécurité que le portefeuille (00317) : filtrage strict sur
-- get_my_supervised_org_ids(), lecture seule, RLS des tables inchangée.

-- get_supervised_risks : p_org_id devient OPTIONNEL. null = tous les assujettis
-- supervisés (registre consolidé) ; une valeur = drill-down d'une org (inchangé).
create or replace function public.get_supervised_risks(p_org_id uuid default null)
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
  where (p_org_id is null or rs.organization_id = p_org_id)
    and rs.organization_id in (select public.get_my_supervised_org_ids())
  order by o.name, (rs.inherent_likelihood * rs.inherent_impact) desc, rs.title;
$$;

revoke all on function public.get_supervised_risks(uuid) from public;
grant execute on function public.get_supervised_risks(uuid) to authenticated;

-- Plan de traitement consolidé : toutes les actions des assujettis supervisés.
create or replace function public.get_supervised_plan()
returns table (
  id uuid, organization_id uuid, org_name text, risk_scenario_id uuid, scenario_title text,
  description text, control_code text, option text, origin text,
  due_date date, status text, verification_status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.organization_id, o.name, a.risk_scenario_id, rs.title,
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
