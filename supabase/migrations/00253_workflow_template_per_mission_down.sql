-- Migration 00253 (DOWN) — restaure l'état 00251 / 00167.

-- 1) Retirer le trigger + fonction d'auto-démotion
drop trigger if exists trg_workflow_template_demote_default on public.organization_workflow_templates;
drop function if exists public.demote_other_default_templates();

-- 2) Restaurer le trigger de snapshot dans sa version 00251 (is_default uniquement)
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
      where t.organization_id = new.cabinet_id and t.is_default limit 1),
    '{}');
  return new;
end $$;

-- 3) Restaurer create_mission_tx dans sa signature 16 params (sans p_template_id)
drop function if exists public.create_mission_tx(
  uuid, uuid, uuid, text, text, text, uuid, uuid, date, date, uuid[], uuid[], uuid, text, date, date, uuid
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
  p_cycle_end             date default null
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
    lead_auditor_id, associate_id, start_date, end_date, status
  ) values (
    p_cabinet_id, p_client_id, p_framework_id, p_name, nullif(p_description, ''), p_kind,
    p_lead_auditor_id, p_associate_id, p_start_date, p_end_date, 'initialization'
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

revoke all on function public.create_mission_tx(
  uuid, uuid, uuid, text, text, text, uuid, uuid, date, date, uuid[], uuid[], uuid, text, date, date
) from public;

-- 4) Retirer la colonne
alter table public.missions drop column if exists workflow_template_id;
