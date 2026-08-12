-- Migration: criticality_iic_standard (DOWN)
-- Restaure les 3 niveaux (mig 00146) : 'indetermine' redevient autorisé + défaut.
-- Les lignes migrées 'indetermine'->'standard' ne sont PAS restaurées (perte
-- d'information volontaire lors du UP).

alter table public.entity_regulatory_profile
  drop constraint if exists entity_regulatory_profile_criticality_check;

alter table public.entity_regulatory_profile
  add constraint entity_regulatory_profile_criticality_check
  check (criticality in ('eleve', 'standard', 'indetermine'));

alter table public.entity_regulatory_profile alter column criticality set default 'indetermine';
