-- Migration: 00354_measure_source_action_up
-- Description: Lot 3 Suivi des actions - escalade d'une action en mesure.
--   Lien explicite mesure -> action d'origine (vaut pour les actions de mission ET
--   manuelles, contrairement a un rapprochement via finding_ids). Expose un drapeau
--   'escalated' dans la fonction d'agregation pour l'indicateur UI.

-- 1) Lien explicite vers l'action corrective a l'origine de la mesure.
alter table public.regulatory_measures
  add column if not exists source_action_id uuid
    references public.corrective_action_requests(id) on delete set null;

create index if not exists idx_measures_source_action on public.regulatory_measures(source_action_id);

-- 2) Fonction d'agregation : + drapeau escalated (au moins une mesure rattachee).
--    DROP prealable car le type de retour change (colonne 'escalated').
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
    car.id,
    car.code,
    car.source,
    car.mission_id,
    m.name as mission_name,
    coalesce(m.client_id, car.entity_id) as entity_id,
    o.name as entity_name,
    car.control_code,
    car.control_name,
    car.finding_classification,
    car.description,
    car.deadline,
    car.client_target_date,
    car.status,
    car.verification_status,
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

comment on function public.get_regulator_action_tracking(uuid) is
  'Suivi des actions (Lot 1+2+3) : CAR de mission (scope cabinet_id) et actions manuelles (scope sous-arbre), + drapeau escalated. Fail-closed pour les clients. Lecture seule.';

revoke execute on function public.get_regulator_action_tracking(uuid) from anon;
grant execute on function public.get_regulator_action_tracking(uuid) to authenticated;
