-- 00188 — Boucle Regul → Risk : un incident aggrave la vraisemblance des scénarios.
--
-- 1) Le staff d'une org (assujetti) doit pouvoir LIRE les incidents de sa propre
--    organisation pour que le score de confiance intègre la sinistralité. Les
--    policies existantes couvrent régulateur→sous-arbre et assujetti→portail client,
--    mais PAS le staff de l'org elle-même → on l'ajoute (lecture seule).
-- 2) Liaison explicite optionnelle incident ↔ scénario (mode hybride : par défaut
--    l'aggravation est automatique par nature→dimension côté applicatif ; un lien
--    explicite cible finement). Org-scoped, personnel non-client, + RESTRICTIVE AAL2.

-- 1) Lecture des incidents de sa propre org par le staff (jamais client).
create policy "inc_select_staff_self"
  on public.incidents for select
  to authenticated
  using (
    not public.is_client_role()
    and entity_id = public.get_my_organization_id()
  );

-- 2) Liaison explicite incident ↔ scénario de risque.
create table public.incident_risk_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (incident_id, risk_scenario_id)
);
create index idx_irl_scenario on public.incident_risk_links(risk_scenario_id);
create index idx_irl_org on public.incident_risk_links(organization_id);

alter table public.incident_risk_links enable row level security;

create policy "irl_org" on public.incident_risk_links for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
create policy "irl_aal2" on public.incident_risk_links as restrictive for all to authenticated
  using (public.is_aal2());
