-- Migration: add_institution_publique_entity_type (UP)
-- Ajoute le type d'assujetti « institution_publique » (Institutions publiques) au
-- CHECK sur organizations.entity_type, EN PLUS des types existants (Comply + Regul).
-- Les lignes existantes restent valides.

alter table public.organizations drop constraint if exists organizations_entity_type_check;

alter table public.organizations
  add constraint organizations_entity_type_check
  check (entity_type is null or entity_type in (
    -- Comply (groupes)
    'filiale', 'site', 'direction', 'business_unit',
    -- Regul (entités publiques)
    'ministere', 'direction_generale', 'agence', 'societe_nationale',
    'operateur', 'institution_financiere', 'institution_publique', 'autre'
  ));
