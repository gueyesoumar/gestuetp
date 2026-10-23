-- Migration: 00353_manual_actions_down
-- Rollback de 00353_manual_actions_up. ATTENTION : supprime les actions manuelles
-- (source='manual') pour pouvoir restaurer les contraintes NOT NULL. Restaure la
-- fonction d'agregation dans sa version 00352 (missions uniquement).

-- 1) Les actions manuelles n'ont pas de mission_id/assessment_id : il faut les
--    supprimer avant de restaurer NOT NULL.
delete from public.corrective_action_requests where source = 'manual';

-- 2) Retrait de la contrainte de coherence et de l'index.
alter table public.corrective_action_requests drop constraint if exists car_source_coherence;
drop index if exists public.idx_car_entity;

-- 3) Restauration de la fonction 00352 (INNER JOIN missions, sans colonne source).
--    DROP prealable car le type de retour change.
drop function if exists public.get_regulator_action_tracking(uuid);
create function public.get_regulator_action_tracking(p_entity_id uuid default null)
returns table (
  id uuid,
  code text,
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
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    car.id, car.code, car.mission_id, m.name as mission_name,
    m.client_id as entity_id, o.name as entity_name,
    car.control_code, car.control_name, car.finding_classification,
    car.description, car.deadline, car.client_target_date,
    car.status, car.verification_status, car.created_at
  from public.corrective_action_requests car
  join public.missions m on m.id = car.mission_id
  join public.organizations o on o.id = m.client_id
  where not public.is_client_role()
    and m.cabinet_id = public.get_my_organization_id()
    and (p_entity_id is null or m.client_id = p_entity_id)
  order by car.created_at desc;
$$;

revoke execute on function public.get_regulator_action_tracking(uuid) from anon;
grant execute on function public.get_regulator_action_tracking(uuid) to authenticated;

-- 4) Restauration des NOT NULL et retrait des colonnes.
alter table public.corrective_action_requests alter column mission_id set not null;
alter table public.corrective_action_requests alter column assessment_id set not null;
alter table public.corrective_action_requests drop column if exists entity_id;
alter table public.corrective_action_requests drop column if exists source;
