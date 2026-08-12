-- Migration: regul_entity_types (UP)
-- Élargit le CHECK sur organizations.entity_type pour accepter les types
-- d'assujetti Gëstu Regul (entités publiques) EN PLUS des types Comply existants
-- (filiale/site/direction/business_unit — inchangés). Le formulaire EntityFormModal
-- affiche la liste Regul en mode régulateur, Comply sinon.
--
-- Les lignes existantes (entity_type = 'filiale', etc.) restent valides.

alter table public.organizations drop constraint if exists organizations_entity_type_check;

alter table public.organizations
  add constraint organizations_entity_type_check
  check (entity_type is null or entity_type in (
    -- Comply (groupes)
    'filiale', 'site', 'direction', 'business_unit',
    -- Regul (entités publiques)
    'ministere', 'direction_generale', 'agence', 'societe_nationale',
    'operateur', 'institution_financiere', 'autre'
  ));
