-- 00184 — Gëstu Risk (RFC 0004) : modèle EBIOS RM 2 couches + registre de scénarios.
--
-- business_values (valeurs métier) → risk_assets (biens supports) → risk_scenarios
-- (registre, cotation 4×4) → risk_control_links (barrières = contrôles Comply).
-- Tout org-scoped. RLS : personnel de l'org (non-client) ; + RESTRICTIVE AAL2.
-- dimension = enum score_dimension (mig 00159) → pont direct vers le score de confiance.

-- ---- Couche 1 EBIOS : valeurs métier ----
create table public.business_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  dimension public.score_dimension,
  criticality text not null default 'standard' check (criticality in ('eleve', 'standard')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bv_org on public.business_values(organization_id);

-- ---- Couche 2 EBIOS : biens supports ----
create table public.risk_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null check (category in ('application', 'data', 'infrastructure', 'third_party', 'process', 'people', 'site')),
  criticality text not null default 'standard' check (criticality in ('eleve', 'standard')),
  business_value_id uuid references public.business_values(id) on delete set null,
  entity_id uuid references public.organizations(id) on delete set null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ra_org on public.risk_assets(organization_id);

-- ---- Registre de scénarios de risque ----
create table public.risk_scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  dimension public.score_dimension,
  business_value_id uuid references public.business_values(id) on delete set null,
  asset_id uuid references public.risk_assets(id) on delete set null,
  source_ref uuid references public.risk_catalog(id) on delete set null,
  feared_event_ref uuid references public.risk_catalog(id) on delete set null,
  threat_ref uuid references public.risk_catalog(id) on delete set null,
  vulnerability text,
  inherent_likelihood int not null default 2 check (inherent_likelihood between 1 and 4),
  inherent_impact int not null default 2 check (inherent_impact between 1 and 4),
  treatment text not null default 'untreated' check (treatment in ('accept', 'reduce', 'transfer', 'avoid', 'untreated')),
  treatment_status text not null default 'open' check (treatment_status in ('open', 'in_progress', 'done')),
  owner_user_id uuid references public.users(id) on delete set null,
  due_date date,
  source_mission_id uuid references public.missions(id) on delete set null,
  source_risk_id uuid references public.mission_risks(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rs_org on public.risk_scenarios(organization_id);
create index idx_rs_dim on public.risk_scenarios(organization_id, dimension);

-- ---- Barrières : contrôles Comply qui maîtrisent un scénario (nœud papillon) ----
create table public.risk_control_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  kind text not null default 'preventive' check (kind in ('preventive', 'detective', 'corrective')),
  created_at timestamptz not null default now(),
  unique (risk_scenario_id, control_id)
);
create index idx_rcl_scenario on public.risk_control_links(risk_scenario_id);

-- updated_at
create trigger trg_bv_updated before update on public.business_values for each row execute function public.set_updated_at();
create trigger trg_ra_updated before update on public.risk_assets for each row execute function public.set_updated_at();
create trigger trg_rs_updated before update on public.risk_scenarios for each row execute function public.set_updated_at();

-- ---- RLS : org-scoped, personnel (non-client) ; + RESTRICTIVE AAL2 ----
alter table public.business_values enable row level security;
alter table public.risk_assets enable row level security;
alter table public.risk_scenarios enable row level security;
alter table public.risk_control_links enable row level security;

create policy "bv_org" on public.business_values for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "bv_aal2" on public.business_values as restrictive for all to authenticated using (public.is_aal2());

create policy "ra_org" on public.risk_assets for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "ra_aal2" on public.risk_assets as restrictive for all to authenticated using (public.is_aal2());

create policy "rs_org" on public.risk_scenarios for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "rs_aal2" on public.risk_scenarios as restrictive for all to authenticated using (public.is_aal2());

create policy "rcl_org" on public.risk_control_links for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "rcl_aal2" on public.risk_control_links as restrictive for all to authenticated using (public.is_aal2());
