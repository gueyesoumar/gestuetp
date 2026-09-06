-- Migration 00217 (UP) — P1c.1 Pass D (RFC 0007) : retrait des colonnes de CONTEXTE
-- de cabinet_clients. La source de vérité est désormais engagement_profiles (P1b) ;
-- tous les lecteurs (7 edge + 4 front) ont été repointés (Pass B + D) et les écrivains
-- (create-client/update-client) n'écrivent plus le contexte sur la fiche (Pass C).
-- L'IDENTITÉ et le branding RESTENT sur cabinet_clients (→ P1c.2, après P2).
-- Purement soustractif ; identité/relationnel/FK/triggers inchangés.

alter table public.cabinet_clients
  drop column if exists effectifs,
  drop column if exists chiffre_affaires,
  drop column if exists nombre_sites,
  drop column if exists activites_principales,
  drop column if exists structure_hierarchique,
  drop column if exists parties_interessees,
  drop column if exists exigences_reglementaires,
  drop column if exists it_environment,
  drop column if exists it_systems,
  drop column if exists notes;
