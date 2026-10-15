-- 00309 - Gëstu Risk / RFC 0017 Lot 1 : critères de risque par organisation
-- (établissement du contexte, ISO 27005 §7). Une ligne PAR org, créée seulement
-- quand l'org personnalise ; sinon le front retombe sur les défauts (constants.ts).
-- Matrice 4×4 figée (décision D1) : pas de colonne matrice, riskExposure() inchangée.
-- Seuls le seuil d'acceptation, les libellés et la cadence de revue sont configurables.

create table public.risk_criteria (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  acceptance_threshold int not null default 60 check (acceptance_threshold between 0 and 100),
  appetite_statement text,
  review_default_months int not null default 6 check (review_default_months > 0),
  likelihood_labels jsonb,  -- null = libellés par défaut (RISK_LIKELIHOOD_LEVELS)
  impact_labels jsonb,      -- null = libellés par défaut (RISK_IMPACT_LEVELS)
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.risk_criteria is
  'Critères de risque par organisation (ISO 27005 contexte) : seuil d''acceptation, appétit, cadence de revue, libellés. 1 ligne/org ; absence = défauts plateforme.';
comment on column public.risk_criteria.acceptance_threshold is
  'Exposition 0..100 au-dessus de laquelle un traitement est obligatoire (drapeau hors seuil).';

create trigger trg_risk_criteria_updated_at
  before update on public.risk_criteria
  for each row execute function public.set_updated_at();

-- Permission cabinet : droit d'éditer les critères de risque de son org.
-- (clé jsonb dans platform_roles.permissions ; attribuée aux rôles admin existants,
--  pattern identique à 00179 can_view_audit_trail.)
update public.platform_roles
set permissions = permissions || '{"can_manage_risk_criteria": true}'::jsonb
where coalesce((permissions->>'can_manage_roles')::boolean, false) = true;

-- RLS : org-scoped, personnel non-client. Écriture gated par la permission.
alter table public.risk_criteria enable row level security;

create policy "risk_criteria_select"
  on public.risk_criteria for select
  using (organization_id = public.get_my_organization_id() and not public.is_client_role());

create policy "risk_criteria_write"
  on public.risk_criteria for all
  using (
    organization_id = public.get_my_organization_id()
    and not public.is_client_role()
    and public.has_cabinet_permission('can_manage_risk_criteria')
  )
  with check (
    organization_id = public.get_my_organization_id()
    and not public.is_client_role()
    and public.has_cabinet_permission('can_manage_risk_criteria')
  );

-- AAL2 obligatoire (standard plateforme, RESTRICTIVE).
create policy "risk_criteria_aal2"
  on public.risk_criteria as restrictive for all
  using (public.is_aal2());
