-- n°18 Lot 1 : revue périodique de conformité des assujettis (Regul).
-- Cadence de revue PAR COUPLE (assujetti, référentiel). L'échéance next_review_at
-- avance à la clôture d'un contrôle (roll_assujetti_review) ou est recalculée quand
-- la cadence change (Edge set-review-cadence). Absence de ligne = pas de revue.
create table if not exists public.assujetti_review_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  framework_id uuid not null references public.frameworks(id) on delete cascade,
  frequency_months int,
  last_reviewed_at timestamptz,
  next_review_at date,
  last_mission_id uuid references public.missions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, framework_id)
);

create index idx_arc_org on public.assujetti_review_cycles(organization_id);
create index idx_arc_next on public.assujetti_review_cycles(next_review_at);

alter table public.assujetti_review_cycles enable row level security;

-- Lecture : staff régulateur, borné au sous-arbre (anti-fuite, calqué sur
-- entity_regulatory_profile). Écritures service_role uniquement (Edge Functions) :
-- aucune policy insert/update/delete pour authenticated.
create policy "arc_select_regulator"
  on public.assujetti_review_cycles for select
  to authenticated
  using (
    not public.is_client_role()
    and organization_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

-- Avancement de l'échéance à la clôture d'un contrôle : ne touche QUE les cycles
-- déjà configurés (cadence posée par le régulateur). SECURITY DEFINER, service_role.
create or replace function public.roll_assujetti_review(
  p_org uuid, p_framework uuid, p_mission uuid, p_closed_at timestamptz
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.assujetti_review_cycles
  set last_reviewed_at = p_closed_at,
      last_mission_id = p_mission,
      next_review_at = case
        when frequency_months is not null
        then (p_closed_at::date + (frequency_months * interval '1 month'))::date
        else next_review_at end,
      updated_at = now()
  where organization_id = p_org and framework_id = p_framework;
end; $$;

revoke all on function public.roll_assujetti_review(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.roll_assujetti_review(uuid, uuid, uuid, timestamptz) to service_role;
