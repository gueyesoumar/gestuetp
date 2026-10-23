-- Migration: 00353_manual_actions_up
-- Description: Lot 2 Suivi des actions - saisie manuelle d'actions correctives par
--   le regulateur (non issues d'une mission). Ajoute l'origine et l'assujetti cible,
--   rend mission_id/assessment_id nullable, et etend la fonction d'agregation 00352
--   pour inclure les actions manuelles (scope sous-arbre).

-- 1) Colonnes d'origine et de ciblage
alter table public.corrective_action_requests
  add column if not exists source text not null default 'mission'
    check (source in ('mission', 'manual')),
  add column if not exists entity_id uuid references public.organizations(id) on delete restrict;

-- 2) mission_id / assessment_id deviennent nullables (une action manuelle n'en a pas)
alter table public.corrective_action_requests alter column mission_id drop not null;
alter table public.corrective_action_requests alter column assessment_id drop not null;

-- 3) Coherence d'origine : une action de mission garde sa mission, une action
--    manuelle porte toujours un assujetti.
alter table public.corrective_action_requests
  add constraint car_source_coherence check (
    (source = 'mission' and mission_id is not null)
    or (source = 'manual' and entity_id is not null)
  );

create index if not exists idx_car_entity on public.corrective_action_requests(entity_id);

-- 4) Fonction d'agregation : LEFT JOIN missions (les actions manuelles n'ont pas de
--    mission) + scope double (missions du regulateur OU assujetti manuel du sous-arbre).
create or replace function public.get_regulator_action_tracking(p_entity_id uuid default null)
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
  'Suivi des actions (Lot 1+2) : CAR de mission (scope cabinet_id) et actions manuelles (scope sous-arbre), agregees pour le regulateur. Fail-closed pour les clients. Lecture seule.';

revoke execute on function public.get_regulator_action_tracking(uuid) from anon;
grant execute on function public.get_regulator_action_tracking(uuid) to authenticated;
