-- P1.1 (RFC 0014 §4) : socle du framework de conformité continue.
-- 4 tables : control_checks (bibliothèque plateforme), control_check_links
-- (contrôle↔check), connector_integrations (connexion OAuth par org, tokens Vault),
-- evidence_results (modèle de preuve commun : verdict + valeur + horodatage + TTL).
--
-- Sécurité (RFC 0014 §6) :
--  - control_checks / control_check_links : référentiel PARTAGÉ, lecture authentifiée,
--    écriture service_role (bibliothèque plateforme gérée par le super-admin).
--  - connector_integrations / evidence_results : org-scoped, lecture par l'org,
--    ÉCRITURE service_role UNIQUEMENT (l'edge connecteur crée les lignes après OAuth ;
--    jamais d'écriture directe par authenticated → pas de falsification de preuve).
--  - secret_ref / raw_ref pointent vers des secrets Vault (tokens / brut chiffrés) ;
--    aucun jeton n'est jamais stocké en clair ici.
--  - Standard plateforme : session MFA (AAL2) requise (restrictive).

-- ------------------------- 1. control_checks (bibliothèque plateforme) -------------------------
-- Décision §10.a : bibliothèque réutilisable, liée aux contrôles via control_check_links.
create table public.control_checks (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('entra', 'google', 'github', 'aws', 'azure', 'gcp')),
  check_key text not null unique,            -- ex. 'entra.mfa_admins'
  title text not null,
  description text,
  default_params jsonb not null default '{}'::jsonb,  -- ex. {"threshold":100}
  dimension public.score_dimension,          -- alimente le trust score (mig 00159)
  severity_on_fail text not null default 'moyen'
    check (severity_on_fail in ('faible', 'moyen', 'fort', 'critique')),
  created_at timestamptz not null default now()
);

comment on table public.control_checks is
  'Bibliothèque plateforme de règles de vérification automatisées (RFC 0014). Lecture partagée ; écriture service_role.';

alter table public.control_checks enable row level security;
create policy "control_checks_read" on public.control_checks
  for select to authenticated using (true);
create policy "control_checks_aal2" on public.control_checks
  as restrictive for all to authenticated using (public.is_aal2());
-- Aucune policy d'écriture → INSERT/UPDATE/DELETE réservés au service_role.

-- ------------------------- 2. control_check_links (contrôle ↔ check) -------------------------
-- Liaison au niveau du référentiel (patron question_controls). Gérée par la plateforme.
create table public.control_check_links (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  check_id uuid not null references public.control_checks(id) on delete cascade,
  params_override jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (control_id, check_id)
);
create index idx_ccl_control on public.control_check_links(control_id);
create index idx_ccl_check on public.control_check_links(check_id);

comment on table public.control_check_links is
  'Liaison contrôle ↔ check (RFC 0014). Un check sert N référentiels. Lecture partagée ; écriture service_role.';

alter table public.control_check_links enable row level security;
create policy "control_check_links_read" on public.control_check_links
  for select to authenticated using (true);
create policy "control_check_links_aal2" on public.control_check_links
  as restrictive for all to authenticated using (public.is_aal2());
-- Aucune policy d'écriture → service_role.

-- ------------------------- 3. connector_integrations (OAuth par org) -------------------------
create table public.connector_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('entra', 'google', 'github', 'aws', 'azure', 'gcp')),
  status text not null default 'active' check (status in ('active', 'revoked', 'error')),
  scopes text[] not null default '{}',         -- minimaux, lecture seule
  secret_ref uuid,                             -- id de secret Vault (tokens chiffrés) ; JAMAIS le token en clair
  external_account text,                       -- ex. tenant id / domaine (affichage)
  connected_by uuid references public.users(id),
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text,
  unique (organization_id, provider)
);
create index idx_ci_org on public.connector_integrations(organization_id);

comment on table public.connector_integrations is
  'Connexion OAuth lecture seule d''une org à un outil (RFC 0014). Tokens en Vault (secret_ref). Lecture par l''org ; écriture service_role (edge connecteur).';

alter table public.connector_integrations enable row level security;
-- Lecture : membres de l'org (statut de connexion), hors rôle client.
create policy "ci_read" on public.connector_integrations
  for select to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "ci_aal2" on public.connector_integrations
  as restrictive for all to authenticated using (public.is_aal2());
-- Aucune policy d'écriture → INSERT/UPDATE/DELETE réservés au service_role (OAuth + Vault).

-- ------------------------- 4. evidence_results (modèle de preuve commun) -------------------------
-- Décision §10.b : verdict + valeur par défaut ; brut (raw_ref) optionnel selon consentement.
create table public.evidence_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  check_id uuid not null references public.control_checks(id) on delete restrict,
  control_id uuid references public.controls(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  verdict text not null check (verdict in ('pass', 'fail', 'warn', 'na')),
  value jsonb not null default '{}'::jsonb,    -- ex. {"mfa_coverage":0.92,"without_mfa":1}
  raw_ref uuid,                                -- preuve brute optionnelle (Vault), selon consentement
  collected_at timestamptz not null default now(),
  expires_at timestamptz,                      -- TTL → fraîcheur / détection de dérive
  hash text                                    -- empreinte versée dans activity_log (probité)
);
create index idx_er_org on public.evidence_results(organization_id);
create index idx_er_control on public.evidence_results(organization_id, control_id);
create index idx_er_check on public.evidence_results(check_id);
create index idx_er_expires on public.evidence_results(expires_at);

comment on table public.evidence_results is
  'Preuve collectée automatiquement (RFC 0014) : verdict + valeur + horodatage + TTL. Lecture par l''org ; écriture service_role (edge connecteur).';

alter table public.evidence_results enable row level security;
create policy "er_read" on public.evidence_results
  for select to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "er_aal2" on public.evidence_results
  as restrictive for all to authenticated using (public.is_aal2());
-- Aucune policy d'écriture → service_role (collecte via edge, preuve non falsifiable).

-- ------------------------- SEED : 3 checks Entra (pilote, §5) -------------------------
insert into public.control_checks (provider, check_key, title, description, default_params, dimension, severity_on_fail) values
  ('entra', 'entra.mfa_admins',
   'MFA activé pour les comptes à privilèges',
   'Vérifie que 100% des comptes détenant un rôle d''administration ont une méthode MFA enregistrée et appliquée.',
   '{"threshold": 100, "roles": ["GlobalAdministrator", "PrivilegedRoleAdministrator"]}'::jsonb,
   'security', 'critique'),
  ('entra', 'entra.stale_privileged',
   'Comptes à privilèges dormants',
   'Signale tout compte à privilèges sans connexion depuis plus de 90 jours.',
   '{"max_idle_days": 90}'::jsonb,
   'security', 'fort'),
  ('entra', 'entra.conditional_access_baseline',
   'Politique d''accès conditionnel de base',
   'Vérifie l''existence d''au moins une politique d''accès conditionnel active imposant le MFA.',
   '{}'::jsonb,
   'security', 'moyen')
on conflict (check_key) do nothing;
