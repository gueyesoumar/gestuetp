-- 00144 — Gëstu Regul (M5) : incidents cyber déclarés par les assujettis.
--
-- Cycle : déclaré -> qualification -> notifié -> résolu -> clôturé. Chaque acte
-- est ancré dans le journal probant (S1) par l'Edge Function declare-incident.
-- Les délais/seuils de notification sont PARAMÉTRABLES (incident_notification_rules)
-- pour ne PAS figer le droit sénégalais tant qu'il n'est pas arrêté.
-- Additive et NEUTRE côté Comply (tables inutilisées en comply).

-- Règles de notification configurables (par gravité)
create table if not exists public.incident_notification_rules (
  severity text primary key check (severity in ('faible', 'moyen', 'eleve', 'critique')),
  initial_hours integer not null,   -- délai de notification initiale (heures)
  final_days integer not null,      -- délai du rapport final (jours)
  requires_cdp boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.incident_notification_rules is
  'Gëstu Regul (M5) : délais/seuils de notification paramétrables. Valeurs par défaut, à ajuster selon l''ancrage juridique.';

-- Valeurs par défaut (placeholders, ajustables) — inspirées des régimes usuels.
insert into public.incident_notification_rules (severity, initial_hours, final_days, requires_cdp) values
  ('faible',   72, 30, false),
  ('moyen',    48, 30, false),
  ('eleve',    24, 21, true),
  ('critique', 24, 14, true)
on conflict (severity) do nothing;

-- Incidents
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  declared_by uuid references public.users(id) on delete set null,
  title text not null,
  category text not null check (category in ('intrusion', 'ransomware', 'fuite_donnees', 'deni_service', 'autre')),
  severity text not null check (severity in ('faible', 'moyen', 'eleve', 'critique')),
  status text not null default 'declared' check (status in ('declared', 'triage', 'notified', 'resolved', 'closed')),
  description text,
  impact text,
  affected_systems text,
  detected_at timestamptz,
  occurred_at timestamptz,
  declared_at timestamptz not null default now(),
  initial_deadline timestamptz,     -- calculé à la déclaration depuis les règles
  final_deadline timestamptz,
  notified_initial_at timestamptz,
  final_report_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.incidents is
  'Gëstu Regul (M5) : incidents cyber des assujettis, ancrés dans probative_log. Vide côté Comply.';

create index if not exists idx_inc_entity on public.incidents(entity_id);
create index if not exists idx_inc_status on public.incidents(status);
create index if not exists idx_inc_mission on public.incidents(mission_id);

create trigger trg_inc_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

-- RLS
alter table public.incident_notification_rules enable row level security;
alter table public.incidents enable row level security;

-- Règles : lisibles par tout staff authentifié (jamais client) ; écriture service_role.
create policy "inr_select_staff"
  on public.incident_notification_rules for select
  to authenticated
  using (not public.is_client_role());

-- Incidents — lecture staff régulateur (sous-arbre)
create policy "inc_select_regulator"
  on public.incidents for select
  to authenticated
  using (
    not public.is_client_role()
    and entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

-- Incidents — lecture assujetti (sa propre organisation)
create policy "inc_select_assujetti"
  on public.incidents for select
  to authenticated
  using (
    public.is_client_role()
    and entity_id = public.get_my_organization_id()
  );

-- Écriture réservée au service_role (Edge Function declare-incident), qui ancre
-- chaque acte dans le journal probant. Aucune policy insert/update pour authenticated.
