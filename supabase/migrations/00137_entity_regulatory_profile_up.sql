-- 00137 — Gëstu Regul (M1) : profil réglementaire des assujettis.
--
-- Table COMPAGNE d'organizations : porte les attributs propres au métier de
-- régulateur (criticité OIV/non-OIV, régime d'obligations, tier, statut de
-- périmètre) sans polluer la table organizations partagée avec Comply.
-- Un assujetti = une organisation "entité" (parent_org_id = l'organe
-- régulateur), réutilisant le modèle Groupe / Axe 1 (00136).
--
-- ADDITIVE et NEUTRE côté Comply : la table reste vide et inutilisée tant
-- qu'aucun profil n'est créé (ne s'affiche qu'en mode produit 'regul').

create table if not exists public.entity_regulatory_profile (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  criticality text not null default 'unknown' check (criticality in ('oiv', 'non_oiv', 'unknown')),
  obligation_regime text,
  tier text,
  status text not null default 'active' check (status in ('active', 'exited')),
  entry_date date,
  exit_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.entity_regulatory_profile is
  'Gëstu Regul (M1) : attributs réglementaires d''un assujetti (org entité). Vide/inutilisée côté Comply.';

create index if not exists idx_erp_org on public.entity_regulatory_profile(organization_id);

create trigger trg_erp_updated_at
  before update on public.entity_regulatory_profile
  for each row execute function public.set_updated_at();

alter table public.entity_regulatory_profile enable row level security;

-- Lecture : staff du régulateur (jamais un rôle client) dont l'assujetti est
-- dans le sous-arbre. Réutilise get_subsidiary_ids (récursif, 00136) +
-- get_my_organization_id (NULL pour un client depuis 00134) -> anti-fuite.
-- SECURITY DEFINER dans les helpers -> pas de récursion RLS.
create policy "erp_select_regulator"
  on public.entity_regulatory_profile for select
  to authenticated
  using (
    not public.is_client_role()
    and organization_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

-- Écriture réservée au service_role (Edge Function manage-entity étendue) :
-- aucune policy insert/update/delete pour 'authenticated' -> tout passe par le
-- backend cloisonné (CLAUDE.md §3, opération sensible sur le périmètre régulé).
