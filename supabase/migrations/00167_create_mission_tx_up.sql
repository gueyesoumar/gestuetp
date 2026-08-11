-- Migration: create_mission_tx (UP)
-- Description: Crée une mission et TOUTES ses dépendances (cycle de supervision,
-- membres d'équipe, exclusions de périmètre) dans UNE seule transaction atomique.
--
-- Motivation : l'Edge Function create-mission enchaînait 4 inserts séparés
-- (mission, cycle, membres, exclusions). Un échec sur les membres n'était que
-- loggé -> une mission pouvait naître sans son équipe (état partiel). Un corps de
-- fonction plpgsql est atomique : si une insertion échoue, tout est annulé.
--
-- Sécurité : SECURITY DEFINER (contourne RLS pour écrire l'équipe/exclusions).
-- L'autorisation métier (can_create_mission, can_be_lead, cloisonnement du client)
-- reste faite EN AMONT par l'Edge Function sous service_role. Cette fonction ne
-- doit JAMAIS être appelable directement par un client authentifié -> EXECUTE
-- révoqué à anon/authenticated ; seul service_role (via l'edge) l'invoque.

create or replace function public.create_mission_tx(
  p_cabinet_id            uuid,
  p_client_id             uuid,
  p_framework_id          uuid,
  p_name                  text,
  p_description           text,
  p_kind                  text,
  p_lead_auditor_id       uuid,
  p_associate_id          uuid,
  p_start_date            date,
  p_end_date              date,
  p_member_ids            uuid[],
  p_excluded_control_ids  uuid[],
  p_created_by            uuid,
  p_cycle_label           text default null,
  p_cycle_start           date default null,
  p_cycle_end             date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
begin
  -- 1. La mission (naît à l'état 'initialization')
  insert into public.missions (
    cabinet_id, client_id, framework_id, name, description, kind,
    lead_auditor_id, associate_id, start_date, end_date, status
  ) values (
    p_cabinet_id, p_client_id, p_framework_id, p_name, nullif(p_description, ''), p_kind,
    p_lead_auditor_id, p_associate_id, p_start_date, p_end_date, 'initialization'
  ) returning id into v_mission_id;

  -- 2. Cycle de supervision (supervision continue uniquement, si les bornes sont fournies)
  if p_kind = 'continuous_supervision' and p_cycle_label is not null then
    insert into public.supervision_cycles (
      mission_id, period_label, period_start, period_end, status, lead_auditor_id, created_by
    ) values (
      v_mission_id, p_cycle_label, p_cycle_start, p_cycle_end, 'in_progress', p_lead_auditor_id, p_created_by
    );
  end if;

  -- 3. Membres d'équipe (rôle dérivé : associé / chef de mission / auditeur)
  if p_member_ids is not null and array_length(p_member_ids, 1) is not null then
    insert into public.mission_members (mission_id, user_id, role)
    select v_mission_id, m,
      case
        when m = p_associate_id    then 'associate'::public.mission_role
        when m = p_lead_auditor_id then 'lead_auditor'::public.mission_role
        else 'auditor'::public.mission_role
      end
    from unnest(p_member_ids) as m
    on conflict (mission_id, user_id) do nothing;
  end if;

  -- 4. Exclusions de périmètre (contrôles hors des domaines retenus à la création).
  --    Modèle d'exclusion cohérent avec le cadrage (mission_exclusions).
  if p_excluded_control_ids is not null and array_length(p_excluded_control_ids, 1) is not null then
    insert into public.mission_exclusions (mission_id, control_id, reason)
    select v_mission_id, c, 'Hors périmètre défini à la création de la mission'
    from unnest(p_excluded_control_ids) as c
    on conflict (mission_id, control_id) do nothing;
  end if;

  return v_mission_id;
end;
$$;

comment on function public.create_mission_tx is
  'Crée une mission + cycle + membres + exclusions de façon atomique. SECURITY DEFINER : autorisation faite en amont par l''Edge Function create-mission (service_role). Non appelable par anon/authenticated.';

-- Verrou de sécurité : seul service_role (postgres) peut exécuter.
revoke all on function public.create_mission_tx(
  uuid, uuid, uuid, text, text, text, uuid, uuid, date, date, uuid[], uuid[], uuid, text, date, date
) from public;
