-- 00331 - Gëstu Risk : rendre le passage constat -> scénario plus fluide, automatique
-- et connecté.
--   D2 : le scénario promu arrive en cycle de vie « analysé » (coté).
--   E1 : le contrôle d'origine est lié comme barrière préventive (défaillante).
--   E2 : une cause est amorcée dans le nœud papillon depuis le constat.
--   E3 : l'impact est dérivé de la classification (distinct de la vraisemblance).
--   D1 : promotion en lot + auto-promotion à la clôture (opt-in par org).
--   D4 : provenance résolue pour l'affichage côté Risk.

-- Opt-in par org : auto-promotion des constats à la clôture (registre de l'assujetti).
alter table public.risk_criteria
  add column if not exists auto_promote_findings boolean not null default false;

-- Coeur partagé (sans contrôle d'autorisation) : crée le scénario « analysé » depuis un
-- constat, idempotent sur source_finding_id, + E1 (barrière) + E2 (cause) + E3 (impact).
create or replace function public._promote_finding_core(
  p_finding_id uuid,
  p_dimension public.score_dimension default null,
  p_likelihood int default null,
  p_impact int default null,
  p_vulnerability text default null,
  p_threat_ref uuid default null,
  p_feared_event_ref uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_mission_id uuid; v_client_id uuid; v_control_id uuid; v_ctrl_dim public.score_dimension;
  v_classification text; v_desc text; v_risk text; v_priority text;
  v_dim public.score_dimension; v_l int; v_i int; v_existing uuid; v_new_id uuid;
begin
  select af.classification, af.description, af.risk, af.priority,
         ca.mission_id, ca.control_id, m.client_id, c.dimension
    into v_classification, v_desc, v_risk, v_priority,
         v_mission_id, v_control_id, v_client_id, v_ctrl_dim
  from public.assessment_findings af
  join public.control_assessments ca on ca.id = af.assessment_id
  join public.missions m on m.id = ca.mission_id
  join public.controls c on c.id = ca.control_id
  where af.id = p_finding_id;

  if v_mission_id is null then raise exception 'constat introuvable'; end if;
  if v_classification = 'strength' then raise exception 'un point fort ne se promeut pas'; end if;

  select id into v_existing from public.risk_scenarios where source_finding_id = p_finding_id limit 1;
  if v_existing is not null then
    update public.assessment_findings set promoted_at = coalesce(promoted_at, now()) where id = p_finding_id;
    return v_existing;
  end if;

  v_dim := coalesce(p_dimension, v_ctrl_dim);
  v_l := coalesce(p_likelihood, case v_priority
      when 'critical' then 4 when 'high' then 3 when 'medium' then 2 when 'low' then 1
      else case v_classification when 'major_nc' then 3 when 'minor_nc' then 2 else 1 end end);
  -- E3 : impact depuis la classification (indépendant de la vraisemblance).
  v_i := coalesce(p_impact, case v_classification when 'major_nc' then 3 when 'minor_nc' then 2 else 1 end);
  if v_l < 1 or v_l > 4 or v_i < 1 or v_i > 4 then raise exception 'cotation invalide'; end if;

  insert into public.risk_scenarios (
    organization_id, title, description, dimension, threat_ref, feared_event_ref, vulnerability,
    inherent_likelihood, inherent_impact, lifecycle_status, source_mission_id, source_finding_id, created_by
  ) values (
    v_client_id,
    left(coalesce(nullif(trim(v_risk), ''), nullif(trim(v_desc), ''), 'Risque'), 200),
    null, v_dim, p_threat_ref, p_feared_event_ref, coalesce(p_vulnerability, nullif(trim(v_desc), '')),
    v_l, v_i, 'analysed', v_mission_id, p_finding_id, null
  ) returning id into v_new_id;

  -- E1 : le contrôle d'origine devient une barrière préventive (son efficacité réelle,
  -- faible car non conforme, est lue depuis son évaluation par le nœud papillon).
  if v_control_id is not null then
    insert into public.risk_control_links (organization_id, risk_scenario_id, control_id, kind)
    values (v_client_id, v_new_id, v_control_id, 'preventive')
    on conflict (risk_scenario_id, control_id) do nothing;
  end if;

  -- E2 : amorce une cause depuis le constat (papillon non vide).
  insert into public.risk_scenario_nodes (organization_id, risk_scenario_id, node_type, label, position, created_by)
  values (v_client_id, v_new_id, 'cause', left(coalesce(nullif(trim(v_desc), ''), 'Constat'), 300), 0, null);

  update public.assessment_findings set promoted_at = now() where id = p_finding_id;
  return v_new_id;
end;
$$;
revoke all on function public._promote_finding_core(uuid, public.score_dimension, int, int, text, uuid, uuid) from public;
revoke all on function public._promote_finding_core(uuid, public.score_dimension, int, int, text, uuid, uuid) from authenticated;

-- Promotion unitaire (modale) : autorisation puis coeur.
create or replace function public.promote_finding(
  p_finding_id uuid,
  p_dimension public.score_dimension default null,
  p_likelihood int default null,
  p_impact int default null,
  p_vulnerability text default null,
  p_threat_ref uuid default null,
  p_feared_event_ref uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_mission_id uuid;
begin
  if not public.is_aal2() then raise exception 'AAL2 requis'; end if;
  select ca.mission_id into v_mission_id
  from public.assessment_findings af join public.control_assessments ca on ca.id = af.assessment_id
  where af.id = p_finding_id;
  if v_mission_id is null then raise exception 'constat introuvable'; end if;
  if v_mission_id not in (select public.get_my_mission_ids()) then raise exception 'non autorisé'; end if;
  return public._promote_finding_core(p_finding_id, p_dimension, p_likelihood, p_impact, p_vulnerability, p_threat_ref, p_feared_event_ref);
end;
$$;
revoke all on function public.promote_finding(uuid, public.score_dimension, int, int, text, uuid, uuid) from public;
grant execute on function public.promote_finding(uuid, public.score_dimension, int, int, text, uuid, uuid) to authenticated;

-- Promotion EN LOT d'une mission (manuelle) : tous les constats éligibles non promus.
create or replace function public.promote_findings_bulk(p_mission_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not public.is_aal2() then raise exception 'AAL2 requis'; end if;
  if p_mission_id not in (select public.get_my_mission_ids()) then raise exception 'non autorisé'; end if;
  for r in
    select af.id from public.assessment_findings af
    join public.control_assessments ca on ca.id = af.assessment_id
    where ca.mission_id = p_mission_id and af.classification <> 'strength' and af.promoted_at is null
  loop
    perform public._promote_finding_core(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.promote_findings_bulk(uuid) from public;
grant execute on function public.promote_findings_bulk(uuid) to authenticated;

-- Auto-promotion à la clôture (opt-in) : promeut si le registre de l'assujetti l'autorise.
-- Pas de contrôle d'identité (appelée par l'edge close-mission en service_role).
create or replace function public.auto_promote_mission_findings(p_mission_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_client uuid; r record; n int := 0;
begin
  select m.client_id into v_client from public.missions m where m.id = p_mission_id;
  if v_client is null then return 0; end if;
  if not coalesce((select auto_promote_findings from public.risk_criteria where organization_id = v_client), false) then
    return 0;
  end if;
  for r in
    select af.id from public.assessment_findings af
    join public.control_assessments ca on ca.id = af.assessment_id
    where ca.mission_id = p_mission_id
      and af.classification in ('major_nc', 'minor_nc') and af.promoted_at is null
  loop
    perform public._promote_finding_core(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.auto_promote_mission_findings(uuid) from public;
grant execute on function public.auto_promote_mission_findings(uuid) to authenticated;

-- D4 : provenance d'un scénario (constat / risque de mission / mission), pour affichage.
create or replace function public.get_scenario_provenance(p_scenario_id uuid)
returns table (origin_type text, origin_label text, mission_id uuid, mission_name text)
language sql stable security definer set search_path = public as $$
  select
    case when s.source_finding_id is not null then 'finding'
         when s.source_risk_id is not null then 'mission_risk'
         when s.source_mission_id is not null then 'mission'
         else 'manual' end,
    coalesce(nullif(trim(af.risk), ''), af.description, mr.title),
    coalesce(s.source_mission_id, ca.mission_id),
    m.name
  from public.risk_scenarios s
  left join public.assessment_findings af on af.id = s.source_finding_id
  left join public.control_assessments ca on ca.id = af.assessment_id
  left join public.mission_risks mr on mr.id = s.source_risk_id
  left join public.missions m on m.id = coalesce(s.source_mission_id, ca.mission_id)
  where s.id = p_scenario_id
    and (s.organization_id = public.get_my_organization_id() or public.can_supervise_org(s.organization_id));
$$;
revoke all on function public.get_scenario_provenance(uuid) from public;
grant execute on function public.get_scenario_provenance(uuid) to authenticated;
