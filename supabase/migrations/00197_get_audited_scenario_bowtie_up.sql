-- 00197 — Nœud papillon complet cross-tenant du scénario de l'audité.
--
-- Même frontière SECURITY DEFINER unique (secure by default) : renvoie, pour un
-- scénario de risque de l'organisation auditée, ses barrières (contrôles + politiques,
-- efficacité calculée sur les missions/politiques de l'AUDITÉ) et ses incidents
-- récents. Autorisation identique à get_audited_org_risks : appelant membre d'une
-- mission active dont son org est le cabinet et dont le client possède le scénario.
-- Retourne du jsonb ; le calcul résiduel/bump reste côté client (helpers partagés).

create or replace function public.get_audited_scenario_bowtie(p_scenario_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_barriers jsonb;
  v_policies jsonb;
  v_incidents jsonb;
  v_linked jsonb;
  v_scen_linked jsonb;
begin
  select rs.organization_id into v_org from public.risk_scenarios rs where rs.id = p_scenario_id;
  if v_org is null then return null; end if;

  if not (
    public.is_aal2() and not public.is_client_role() and exists (
      select 1 from public.missions m
      join public.mission_members mm on mm.mission_id = m.id
      where m.cabinet_id = public.get_my_organization_id()
        and mm.user_id = public.get_my_user_id()
        and m.is_active = true
        and m.client_id = v_org
    )
  ) then return null; end if;

  -- Contrôles-barrières + efficacité = ratio d'évaluations approuvées dans les missions de l'audité.
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', c.code, 'name', c.name, 'kind', rcl.kind, 'effectiveness', coalesce(e.eff, 0)
  )), '[]'::jsonb) into v_barriers
  from public.risk_control_links rcl
  join public.controls c on c.id = rcl.control_id
  left join lateral (
    select avg(case when ca.status = 'approved' then 1.0 else 0.0 end) as eff
    from public.control_assessments ca
    join public.missions m on m.id = ca.mission_id
    where ca.control_id = rcl.control_id and m.client_id = v_org
  ) e on true
  where rcl.risk_scenario_id = p_scenario_id;

  -- Politiques-barrières + efficacité = force de preuve (appliquée=1, approuvée=0.5, sinon 0).
  select coalesce(jsonb_agg(jsonb_build_object(
    'title', p.title, 'kind', prl.kind,
    'effectiveness', case
      when p.status in ('approved', 'published')
        and exists (select 1 from public.policy_effectiveness_attestations ea where ea.policy_id = p.id and ea.status = 'applied') then 1.0
      when p.status in ('approved', 'published') then 0.5
      else 0.0 end
  )), '[]'::jsonb) into v_policies
  from public.policy_risk_links prl
  join public.policies p on p.id = prl.policy_id
  where prl.risk_scenario_id = p_scenario_id;

  -- Incidents récents (12 mois) de l'org auditée + ensembles de liaison.
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'category', i.category, 'severity', i.severity)), '[]'::jsonb) into v_incidents
  from public.incidents i
  where i.entity_id = v_org and i.declared_at >= (now() - interval '12 months');

  select coalesce(jsonb_agg(distinct irl.incident_id), '[]'::jsonb) into v_linked
  from public.incident_risk_links irl where irl.organization_id = v_org;

  select coalesce(jsonb_agg(irl.incident_id), '[]'::jsonb) into v_scen_linked
  from public.incident_risk_links irl where irl.risk_scenario_id = p_scenario_id;

  return jsonb_build_object(
    'barriers', v_barriers,
    'policyBarriers', v_policies,
    'incidents', v_incidents,
    'linkedIncidentIds', v_linked,
    'scenarioIncidentIds', v_scen_linked
  );
end;
$$;

revoke all on function public.get_audited_scenario_bowtie(uuid) from public;
grant execute on function public.get_audited_scenario_bowtie(uuid) to authenticated;
