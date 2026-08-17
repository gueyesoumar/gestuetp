-- 00183 — Gëstu Risk (RFC 0004) : bibliothèque normalisée EBIOS RM + ISO 27005.
--
-- Référentiel PARTAGÉ (lecture pour tout compte authentifié ; écriture réservée
-- au super-admin / service_role — aucune policy d'écriture pour authenticated).
-- Alimente le nœud papillon : sources de risque, événements redoutés, menaces types.

create table public.risk_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('source_de_risque', 'evenement_redoute', 'menace_type')),
  code text not null,
  label text not null,
  framework text not null check (framework in ('ebios_rm', 'iso_27005')),
  description text,
  created_at timestamptz not null default now(),
  unique (framework, kind, code)
);

comment on table public.risk_catalog is
  'Référentiel normalisé EBIOS RM + ISO 27005 (sources de risque, événements redoutés, menaces types). Lecture partagée ; écriture super-admin/service_role.';

create index idx_risk_catalog_kind on public.risk_catalog(kind);

alter table public.risk_catalog enable row level security;

-- Lecture pour tout authentifié (référentiel commun à toutes les orgs).
create policy "risk_catalog_read" on public.risk_catalog
  for select to authenticated using (true);

-- Standard plateforme : session MFA (AAL2) requise.
create policy "risk_catalog_aal2" on public.risk_catalog
  as restrictive for all to authenticated using (public.is_aal2());

-- Aucune policy INSERT/UPDATE/DELETE pour authenticated → écriture service_role only.

-- ---- SEED : EBIOS RM (sources de risque, événements redoutés) + ISO 27005 (menaces) ----
insert into public.risk_catalog (kind, code, label, framework, description) values
  -- Sources de risque (EBIOS RM — atelier 1)
  ('source_de_risque', 'SR-ETAT', 'État / attaquant étatique', 'ebios_rm', 'Acteur étatique visant espionnage ou sabotage.'),
  ('source_de_risque', 'SR-CRIME', 'Cybercriminel', 'ebios_rm', 'Motivation financière : rançongiciel, fraude.'),
  ('source_de_risque', 'SR-HACKT', 'Hacktiviste', 'ebios_rm', 'Motivation idéologique.'),
  ('source_de_risque', 'SR-INT-MAL', 'Interne malveillant', 'ebios_rm', 'Employé ou prestataire malveillant.'),
  ('source_de_risque', 'SR-INT-NEG', 'Interne négligent', 'ebios_rm', 'Erreur ou négligence humaine.'),
  ('source_de_risque', 'SR-CONC', 'Concurrent', 'ebios_rm', 'Espionnage économique.'),
  -- Événements redoutés (EBIOS RM — atelier 1)
  ('evenement_redoute', 'ER-CONF', 'Atteinte à la confidentialité', 'ebios_rm', 'Divulgation de données sensibles.'),
  ('evenement_redoute', 'ER-INTEG', 'Atteinte à l''intégrité', 'ebios_rm', 'Altération de données ou de traitements.'),
  ('evenement_redoute', 'ER-DISPO', 'Indisponibilité', 'ebios_rm', 'Interruption d''un service essentiel.'),
  ('evenement_redoute', 'ER-TRACA', 'Perte de traçabilité', 'ebios_rm', 'Impossibilité de prouver ou d''auditer.'),
  ('evenement_redoute', 'ER-CONFORM', 'Non-conformité réglementaire', 'ebios_rm', 'Sanction, mise en demeure.'),
  ('evenement_redoute', 'ER-REPUT', 'Atteinte à la réputation', 'ebios_rm', 'Perte de confiance des parties prenantes.'),
  -- Menaces types (ISO/IEC 27005 — annexe)
  ('menace_type', 'MN-MALWARE', 'Code malveillant', 'iso_27005', 'Virus, ver, cheval de Troie, rançongiciel.'),
  ('menace_type', 'MN-PHISH', 'Hameçonnage / ingénierie sociale', 'iso_27005', 'Manipulation pour obtenir un accès.'),
  ('menace_type', 'MN-INTRUS', 'Intrusion / accès non autorisé', 'iso_27005', 'Compromission d''un système.'),
  ('menace_type', 'MN-DDOS', 'Déni de service', 'iso_27005', 'Saturation d''un service.'),
  ('menace_type', 'MN-FUITE', 'Fuite / exfiltration de données', 'iso_27005', 'Vol ou perte de données.'),
  ('menace_type', 'MN-PHYS', 'Menace physique / environnementale', 'iso_27005', 'Incendie, inondation, coupure électrique.'),
  ('menace_type', 'MN-DEFAIL', 'Défaillance technique', 'iso_27005', 'Panne matérielle ou logicielle.'),
  ('menace_type', 'MN-TIERS', 'Compromission via un tiers', 'iso_27005', 'Chaîne d''approvisionnement, prestataire.'),
  ('menace_type', 'MN-ERREUR', 'Erreur d''exploitation', 'iso_27005', 'Mauvaise manipulation ou configuration.');
