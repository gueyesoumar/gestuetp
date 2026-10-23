-- Migration: 00352_regulator_action_tracking_up
-- Description: Suivi des actions au niveau regulateur (Lot 1, lecture seule).
--   Le staff regulateur n'est PAS membre des missions de controle : la RLS
--   car_all_team (appartenance mission via get_my_mission_ids()) ne lui donne
--   donc rien. Cette fonction SECURITY DEFINER ouvre un chemin de lecture AGREGE,
--   scope au sous-arbre du regulateur (missions dont cabinet_id = son organisation),
--   SANS modifier la RLS de corrective_action_requests (donc sans elargir l'acces
--   des cabinets Comply a leurs propres CAR hors equipe de mission).
--   Fail-closed : rejette les roles client ; ne renvoie que les missions de l'org
--   appelante. Pas d'ecriture.

create or replace function public.get_regulator_action_tracking(p_entity_id uuid default null)
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
    car.id,
    car.code,
    car.mission_id,
    m.name as mission_name,
    m.client_id as entity_id,
    o.name as entity_name,
    car.control_code,
    car.control_name,
    car.finding_classification,
    car.description,
    car.deadline,
    car.client_target_date,
    car.status,
    car.verification_status,
    car.created_at
  from public.corrective_action_requests car
  join public.missions m on m.id = car.mission_id
  join public.organizations o on o.id = m.client_id
  where not public.is_client_role()
    and m.cabinet_id = public.get_my_organization_id()
    and (p_entity_id is null or m.client_id = p_entity_id)
  order by car.created_at desc;
$$;

comment on function public.get_regulator_action_tracking(uuid) is
  'Lot 1 Suivi des actions : CAR agregees cross-missions pour le regulateur (cabinet_id = org appelante), scope sous-arbre, fail-closed pour les clients. Lecture seule.';

revoke execute on function public.get_regulator_action_tracking(uuid) from anon;
grant execute on function public.get_regulator_action_tracking(uuid) to authenticated;
