-- Migration: criticality_iic_standard (UP)
-- Regul : la criticité d'un assujetti se réduit à DEUX niveaux —
--   'eleve'    = IIC (Infrastructure d'Information Critique), le plus haut
--   'standard' = Standard
-- On retire 'indetermine' (mig 00146). Les lignes existantes en 'indetermine'
-- basculent vers 'standard' (défaut neutre) avant de resserrer le CHECK.

update public.entity_regulatory_profile
  set criticality = 'standard'
  where criticality = 'indetermine';

alter table public.entity_regulatory_profile alter column criticality set default 'standard';

alter table public.entity_regulatory_profile
  drop constraint if exists entity_regulatory_profile_criticality_check;

alter table public.entity_regulatory_profile
  add constraint entity_regulatory_profile_criticality_check
  check (criticality in ('eleve', 'standard'));
