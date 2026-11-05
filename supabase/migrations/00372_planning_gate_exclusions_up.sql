-- 00372 - Gate planning→fieldwork : exclure les contrôles exclus du périmètre.
--
-- Bug (bilan refonte) : transition_mission_to_fieldwork (mig 00182) comptait TOUS
-- les contrôles du référentiel, sans soustraire mission_exclusions. Un contrôle
-- exclu exigeait donc quand même une affectation → bloquait la bascule à tort.
-- Correctif : total et affectés excluent les contrôles présents dans
-- mission_exclusions pour cette mission. Seul bloquant inchangé (affectation).

create or replace function public.transition_mission_to_fieldwork(p_mission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_framework_id uuid;
  v_total_controls integer;
  v_assigned_count integer;
  v_missing jsonb := '[]'::jsonb;
begin
  -- 1. Access check
  if p_mission_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_mission_id');
  end if;
  if not exists (select 1 from public.get_my_mission_ids() mid where mid = p_mission_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- 2. Read mission state
  select status, framework_id into v_status, v_framework_id
  from public.missions where id = p_mission_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'mission_not_found');
  end if;
  if v_status <> 'planning' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'current_status', v_status);
  end if;

  -- 3. SEUL prérequis bloquant : tous les contrôles DU PÉRIMÈTRE (hors exclusions)
  --    affectés à un auditeur.
  select count(*) into v_total_controls
  from public.controls c
  join public.domains d on d.id = c.domain_id
  where d.framework_id = v_framework_id
    and not exists (
      select 1 from public.mission_exclusions me
      where me.mission_id = p_mission_id and me.control_id = c.id
    );

  select count(distinct mca.control_id) into v_assigned_count
  from public.mission_control_assignments mca
  join public.controls c on c.id = mca.control_id
  join public.domains d on d.id = c.domain_id
  where mca.mission_id = p_mission_id
    and d.framework_id = v_framework_id
    and not exists (
      select 1 from public.mission_exclusions me
      where me.mission_id = p_mission_id and me.control_id = mca.control_id
    );

  if v_assigned_count < v_total_controls then
    v_missing := v_missing || jsonb_build_object(
      'key', 'assigned',
      'label', 'Tous les contrôles affectés à un auditeur',
      'count', v_assigned_count,
      'total', v_total_controls
    );
  end if;

  -- (technique d'audit / acteurs SI / entretiens : NON bloquants - retirés du gate.)

  -- 4. Decision
  if jsonb_array_length(v_missing) > 0 then
    return jsonb_build_object('ok', false, 'error', 'blockers_failed', 'missing', v_missing);
  end if;

  -- 5. Apply transition
  update public.missions
  set status = 'fieldwork', updated_at = now()
  where id = p_mission_id and status = 'planning';

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.transition_mission_to_fieldwork(uuid) is
  'SECURITY DEFINER - bascule planning→fieldwork. Seul bloquant : contrôles DU PÉRIMÈTRE (hors mission_exclusions) tous affectés (mig 00372). Retourne {ok, missing[]?, error?}.';
