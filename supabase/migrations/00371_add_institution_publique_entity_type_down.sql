-- Migration: add_institution_publique_entity_type (DOWN)
-- Restaure le CHECK sans « institution_publique ». ATTENTION : échoue si des lignes
-- portent déjà ce type - les remettre à NULL / un autre type d'abord.

alter table public.organizations drop constraint if exists organizations_entity_type_check;

alter table public.organizations
  add constraint organizations_entity_type_check
  check (entity_type is null or entity_type in (
    'filiale', 'site', 'direction', 'business_unit',
    'ministere', 'direction_generale', 'agence', 'societe_nationale',
    'operateur', 'institution_financiere', 'autre'
  ));
