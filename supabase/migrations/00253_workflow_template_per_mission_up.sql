-- Migration 00253 (UP) — RFC 0009 phase 2 : choix du template à la création (INC 5).
--
-- Permet de CHOISIR un template de parcours par mission (au lieu du seul is_default).
-- Le choix est porté comme identifiant (missions.workflow_template_id), figé à la
-- création par le trigger de snapshot. Rétro-compatible : template_id NULL → fallback
-- is_default (comportement actuel). Ajoute aussi un trigger d'auto-démotion pour
-- garantir un seul is_default par org.

-- 1) Colonne d'identifiant du template choisi (traçabilité + résolution par le trigger)
alter table public.missions
  add column if not exists workflow_template_id uuid
    references public.organization_workflow_templates(id) on delete set null;
comment on column public.missions.workflow_template_id is
  'RFC 0009 phase 2 : template de parcours choisi à la création (source du snapshot workflow_disabled_steps). NULL = template is_default de l''org.';

-- 2) Le trigger de snapshot résout d'abord le template CHOISI, sinon le is_default.
--    Un template choisi à disabled_steps={} (parcours complet) prime sur is_default.
create or replace function public.mission_snapshot_workflow_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.workflow_version := coalesce(
    (select o.workflow_version from public.organizations o where o.id = new.cabinet_id),
    'audit');
  new.workflow_disabled_steps := coalesce(
    (select t.disabled_steps from public.organization_workflow_templates t
      where t.id = new.workflow_template_id and t.organization_id = new.cabinet_id),
    (select t.disabled_steps from public.organization_workflow_templates t
      where t.organization_id = new.cabinet_id and t.is_default limit 1),
    '{}');
  return new;
end $$;

-- 3) create_mission_tx : nouveau paramètre p_template_id (en fin de signature).
--    On DROP l'ancienne signature (16 params) avant de recréer (sinon surcharge).
drop function if exists public.create_mission_tx(
  uuid, uuid, uuid, text, text, text, uuid, uuid, date, date, uuid[], uuid[], uuid, text, date, date
);

create function public.create_mission_tx(
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
  p_cycle_end             date default null,
  p_template_id           uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
begin
  insert into public.missions (
    cabinet_id, client_id, framework_id, name, description, kind,
    lead_auditor_id, associate_id, start_date, end_date, status, workflow_template_id
  ) values (
    p_cabinet_id, p_client_id, p_framework_id, p_name, nullif(p_description, ''), p_kind,
    p_lead_auditor_id, p_associate_id, p_start_date, p_end_date, 'initialization', p_template_id
  ) returning id into v_mission_id;

  if p_kind = 'continuous_supervision' and p_cycle_label is not null then
    insert into public.supervision_cycles (
      mission_id, period_label, period_start, period_end, status, lead_auditor_id, created_by
    ) values (
      v_mission_id, p_cycle_label, p_cycle_start, p_cycle_end, 'in_progress', p_lead_auditor_id, p_created_by
    );
  end if;

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
  'Crée une mission + cycle + membres + exclusions de façon atomique. SECURITY DEFINER : autorisation faite en amont par l''Edge Function create-mission (service_role). Non appelable par anon/authenticated. p_template_id (RFC 0009) fige le parcours choisi.';

revoke all on function public.create_mission_tx(
  uuid, uuid, uuid, text, text, text, uuid, uuid, date, date, uuid[], uuid[], uuid, text, date, date, uuid
) from public;

-- 4) Auto-démotion : garantir un seul is_default par org (l'éditeur coche, la base démet).
create or replace function public.demote_other_default_templates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.organization_workflow_templates
      set is_default = false
      where organization_id = new.organization_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

create trigger trg_workflow_template_demote_default
  before insert or update of is_default on public.organization_workflow_templates
  for each row execute function public.demote_other_default_templates();
