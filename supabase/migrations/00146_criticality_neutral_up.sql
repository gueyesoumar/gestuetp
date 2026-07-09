-- 00146 — Gëstu Regul : criticité neutre (dé-OIV-isation).
--
-- « OIV » est un terme franco-français (LPM/ANSSI) pas nécessairement retenu au
-- Sénégal. On passe à une échelle de criticité NEUTRE et configurable (le libellé
-- affiché vit dans src/lib/constants.ts, changeable en un point) :
--   oiv -> eleve | non_oiv -> standard | unknown -> indetermine

alter table public.entity_regulatory_profile alter column criticality drop default;

update public.entity_regulatory_profile
set criticality = case criticality
  when 'oiv' then 'eleve'
  when 'non_oiv' then 'standard'
  else 'indetermine'
end;

alter table public.entity_regulatory_profile
  drop constraint if exists entity_regulatory_profile_criticality_check;

alter table public.entity_regulatory_profile
  add constraint entity_regulatory_profile_criticality_check
  check (criticality in ('eleve', 'standard', 'indetermine'));

alter table public.entity_regulatory_profile
  alter column criticality set default 'indetermine';
