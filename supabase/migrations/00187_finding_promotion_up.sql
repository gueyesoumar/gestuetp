-- 00187 — Promotion d'un constat (assessment_finding) vers le registre Gëstu Risk
-- de l'ORGANISATION AUDITÉE. Miroir de 00186 (mission_risk), mais côté contrôle :
-- un constat est rattaché à une évaluation de contrôle → mission (client_id) ET
-- contrôle (controls.dimension) ⇒ la DIMENSION du score est auto-déduite.
-- Mêmes garde-fous : SECURITY DEFINER, AAL2, appartenance équipe, idempotence,
-- cloisonnement strict (org auditée propriétaire ; le cabinet ne voit que « Promu »).

alter table public.risk_scenarios
  add column if not exists source_finding_id uuid references public.assessment_findings(id) on delete set null;

alter table public.assessment_findings
  add column if not exists promoted_at timestamptz;
comment on column public.assessment_findings.promoted_at is
  'Horodatage de promotion vers le registre Gëstu Risk de l''organisation auditée (null = non promu).';

create or replace function public.promote_finding(
  p_finding_id uuid,
  p_dimension public.score_dimension default null,
  p_likelihood int default null,
  p_impact int default null,
  p_vulnerability text default null,
  p_threat_ref uuid default null,
  p_feared_event_ref uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_client_id uuid;
  v_ctrl_dim public.score_dimension;
  v_classification text;
  v_desc text;
  v_risk text;
  v_priority text;
  v_dim public.score_dimension;
  v_l int;
  v_i int;
  v_existing uuid;
  v_new_id uuid;
begin
  -- Garde AAL2 (cohérent avec les policies RESTRICTIVE de Gëstu Risk).
  if not public.is_aal2() then
    raise exception 'AAL2 requis';
  end if;

  -- Charger le constat + son évaluation → mission (client_id) + contrôle (dimension).
  select af.classification, af.description, af.risk, af.priority,
         ca.mission_id, m.client_id, c.dimension
    into v_classification, v_desc, v_risk, v_priority,
         v_mission_id, v_client_id, v_ctrl_dim
  from public.assessment_findings af
  join public.control_assessments ca on ca.id = af.assessment_id
  join public.missions m on m.id = ca.mission_id
  join public.controls c on c.id = ca.control_id
  where af.id = p_finding_id;

  if v_mission_id is null then
    raise exception 'constat introuvable';
  end if;

  -- Un point fort n'est pas un risque.
  if v_classification = 'strength' then
    raise exception 'un point fort ne se promeut pas';
  end if;

  -- Autorisation : l'appelant doit être membre de l'équipe de la mission (staff).
  if v_mission_id not in (select public.get_my_mission_ids()) then
    raise exception 'non autorisé';
  end if;

  -- Idempotence : une seule promotion par constat.
  select id into v_existing
  from public.risk_scenarios
  where source_finding_id = p_finding_id
  limit 1;
  if v_existing is not null then
    update public.assessment_findings set promoted_at = coalesce(promoted_at, now())
      where id = p_finding_id;
    return v_existing;
  end if;

  -- Dimension : celle fournie sinon celle du contrôle (auto-déduction).
  v_dim := coalesce(p_dimension, v_ctrl_dim);

  -- Cotation : fournie sinon dérivée de priority, sinon de la classification.
  v_l := coalesce(p_likelihood,
    case v_priority
      when 'critical' then 4 when 'high' then 3 when 'medium' then 2 when 'low' then 1
      else case v_classification when 'major_nc' then 3 when 'minor_nc' then 2 else 1 end
    end);
  v_i := coalesce(p_impact, v_l);
  if v_l < 1 or v_l > 4 or v_i < 1 or v_i > 4 then
    raise exception 'cotation invalide';
  end if;

  -- Titre = le constat ; description du scénario = le risque associé.
  insert into public.risk_scenarios (
    organization_id, title, description, dimension,
    threat_ref, feared_event_ref, vulnerability,
    inherent_likelihood, inherent_impact,
    source_mission_id, source_finding_id, created_by
  ) values (
    v_client_id,
    left(coalesce(nullif(trim(v_desc), ''), 'Constat'), 200),
    v_risk, v_dim,
    p_threat_ref, p_feared_event_ref, p_vulnerability,
    v_l, v_i,
    v_mission_id, p_finding_id, null
  ) returning id into v_new_id;

  update public.assessment_findings set promoted_at = now() where id = p_finding_id;

  return v_new_id;
end;
$$;

revoke all on function public.promote_finding(uuid, public.score_dimension, int, int, text, uuid, uuid) from public;
grant execute on function public.promote_finding(uuid, public.score_dimension, int, int, text, uuid, uuid) to authenticated;
