-- 00311 - Gëstu Risk / RFC 0017 Lot 2 : plan de traitement structuré.
-- N actions par scénario, avec responsable / échéance / statut et lien SoA vers un
-- contrôle Comply. Les champs directive régulateur (origin/verification) sont présents
-- dès maintenant ; le câblage cross-tenant superviseur est différé (lot supervision).

create table public.risk_treatment_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  description text not null,
  option text check (option in ('reduce','transfer','avoid','accept')),  -- null = hérite du scénario
  control_id uuid references public.controls(id) on delete set null,     -- lien SoA
  owner_user_id uuid references public.users(id) on delete set null,
  due_date date,
  status text not null default 'todo' check (status in ('todo','in_progress','done','cancelled')),
  cost_estimate numeric,
  origin text not null default 'internal' check (origin in ('internal','supervisor_directive')),
  requested_by uuid references public.users(id) on delete set null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.risk_treatment_actions is
  'Actions de traitement d''un scénario de risque (RFC 0017 Lot 2). origin=supervisor_directive = demande du régulateur (câblage superviseur en lot ultérieur).';

create index idx_rta_scenario on public.risk_treatment_actions(risk_scenario_id);
create index idx_rta_org on public.risk_treatment_actions(organization_id);
create index idx_rta_status on public.risk_treatment_actions(status);

create trigger trg_rta_updated_at
  before update on public.risk_treatment_actions
  for each row execute function public.set_updated_at();

-- RLS : org-scoped, personnel non-client (patron risk_control_links).
alter table public.risk_treatment_actions enable row level security;

create policy "rta_org" on public.risk_treatment_actions for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());

create policy "rta_aal2" on public.risk_treatment_actions as restrictive for all to authenticated
  using (public.is_aal2());
