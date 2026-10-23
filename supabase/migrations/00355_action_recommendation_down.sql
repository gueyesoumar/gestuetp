-- Migration: 00355_action_recommendation_down
-- Rollback de 00355 : retire recommendation/risk du RPC (version 00354).

drop function if exists public.get_regulator_action_tracking(uuid);
create function public.get_regulator_action_tracking(p_entity_id uuid default null)
returns table (
  id uuid,
  code text,
  source text,
  mission_id uuid,
  mission_name text,
  entity_id uuid,
  entity_name text,
  control_code text,
  control_name text,
  finding_classification text,
  description text,
  deadline date,
  client_target_date date,
  status text,
  verification_status text,
  escalated boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    car.id, car.code, car.source, car.mission_id, m.name as mission_name,
    coalesce(m.client_id, car.entity_id) as entity_id, o.name as entity_name,
    car.control_code, car.control_name, car.finding_classification,
    car.description, car.deadline, car.client_target_date,
    car.status, car.verification_status,
    exists (select 1 from public.regulatory_measures rm where rm.source_action_id = car.id) as escalated,
    car.created_at
  from public.corrective_action_requests car
  left join public.missions m on m.id = car.mission_id
  left join public.organizations o on o.id = coalesce(m.client_id, car.entity_id)
  where not public.is_client_role()
    and (
      (car.source = 'mission' and m.cabinet_id = public.get_my_organization_id())
      or (car.source = 'manual' and car.entity_id in (
            select public.get_subsidiary_ids(public.get_my_organization_id())))
    )
    and (p_entity_id is null or coalesce(m.client_id, car.entity_id) = p_entity_id)
  order by car.created_at desc;
$$;

revoke execute on function public.get_regulator_action_tracking(uuid) from anon;
grant execute on function public.get_regulator_action_tracking(uuid) to authenticated;
