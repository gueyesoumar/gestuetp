-- 00146 (DOWN) — restaure les valeurs OIV.
alter table public.entity_regulatory_profile alter column criticality drop default;

update public.entity_regulatory_profile
set criticality = case criticality
  when 'eleve' then 'oiv'
  when 'standard' then 'non_oiv'
  else 'unknown'
end;

alter table public.entity_regulatory_profile
  drop constraint if exists entity_regulatory_profile_criticality_check;

alter table public.entity_regulatory_profile
  add constraint entity_regulatory_profile_criticality_check
  check (criticality in ('oiv', 'non_oiv', 'unknown'));

alter table public.entity_regulatory_profile
  alter column criticality set default 'unknown';
