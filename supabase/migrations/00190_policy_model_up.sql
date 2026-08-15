-- 00190 — Gëstu Policy (RFC 0005) : registre de gouvernance vivant.
--
-- policies (cycle de vie 6 états, 3 provenances) → policy_versions (contenu OU
-- fichier joint, sceau d'approbation) ; connexions écosystème : policy_control_links
-- (Policy-as-Evidence), policy_risk_links (Policy-as-Barrier) ; attestations :
-- policy_acknowledgements (adoption/lecture) + policy_effectiveness_attestations
-- (application effective). Tout org-scoped + RESTRICTIVE AAL2 (patron mig 00184).

-- ---- Cœur : politiques + versions ----
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  summary text,
  provenance text not null default 'native' check (provenance in ('native', 'ai', 'imported')),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'published', 'revision', 'retired')),
  dimension public.score_dimension,
  owner_user_id uuid references public.users(id) on delete set null,
  current_version_id uuid,
  review_period_months int not null default 12,
  next_review_at date,
  approved_at timestamptz,
  published_at timestamptz,
  retired_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pol_org on public.policies(organization_id);
create index idx_pol_status on public.policies(organization_id, status);

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version_label text not null,
  content text,
  file_path text,
  change_note text,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_pv_policy on public.policy_versions(policy_id);

-- FK circulaire résolue après création de policy_versions.
alter table public.policies
  add constraint policies_current_version_fk
  foreign key (current_version_id) references public.policy_versions(id) on delete set null;

-- ---- Connexions écosystème ----
create table public.policy_control_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  evidence_catalog_id uuid references public.evidence_catalog(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (policy_id, control_id)
);
create index idx_pcl_policy on public.policy_control_links(policy_id);
create index idx_pcl_control on public.policy_control_links(control_id);

create table public.policy_risk_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  kind text not null default 'preventive' check (kind in ('preventive', 'detective', 'corrective')),
  created_at timestamptz not null default now(),
  unique (policy_id, risk_scenario_id)
);
create index idx_prl_policy on public.policy_risk_links(policy_id);
create index idx_prl_scenario on public.policy_risk_links(risk_scenario_id);

-- ---- Attestations ----
create table public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  policy_version_id uuid not null references public.policy_versions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (policy_version_id, user_id)
);
create index idx_pack_policy on public.policy_acknowledgements(policy_id);

create table public.policy_effectiveness_attestations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  policy_version_id uuid references public.policy_versions(id) on delete set null,
  attested_by uuid references public.users(id) on delete set null,
  status text not null default 'applied' check (status in ('applied', 'partial', 'not_verified')),
  evidence_note text,
  evidence_path text,
  attested_at timestamptz not null default now(),
  next_due date
);
create index idx_pea_policy on public.policy_effectiveness_attestations(policy_id);

-- ---- updated_at ----
create trigger trg_pol_updated before update on public.policies for each row execute function public.set_updated_at();

-- ---- RLS : org-scoped, personnel (non-client) ; + RESTRICTIVE AAL2 ----
alter table public.policies enable row level security;
alter table public.policy_versions enable row level security;
alter table public.policy_control_links enable row level security;
alter table public.policy_risk_links enable row level security;
alter table public.policy_acknowledgements enable row level security;
alter table public.policy_effectiveness_attestations enable row level security;

create policy "pol_org" on public.policies for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "pol_aal2" on public.policies as restrictive for all to authenticated using (public.is_aal2());

create policy "pv_org" on public.policy_versions for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "pv_aal2" on public.policy_versions as restrictive for all to authenticated using (public.is_aal2());

create policy "pcl_org" on public.policy_control_links for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "pcl_aal2" on public.policy_control_links as restrictive for all to authenticated using (public.is_aal2());

create policy "prl_org" on public.policy_risk_links for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "prl_aal2" on public.policy_risk_links as restrictive for all to authenticated using (public.is_aal2());

-- Adoption : lecture org-large (calcul du taux) ; un membre ne crée que SA propre attestation.
create policy "pack_select" on public.policy_acknowledgements for select to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "pack_insert_self" on public.policy_acknowledgements for insert to authenticated
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role() and user_id = public.get_my_user_id());
create policy "pack_delete_self" on public.policy_acknowledgements for delete to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role() and user_id = public.get_my_user_id());
create policy "pack_aal2" on public.policy_acknowledgements as restrictive for all to authenticated using (public.is_aal2());

create policy "pea_org" on public.policy_effectiveness_attestations for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "pea_aal2" on public.policy_effectiveness_attestations as restrictive for all to authenticated using (public.is_aal2());
