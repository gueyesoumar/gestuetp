-- Migration: Informations complementaires organizations (UP)

alter table public.organizations
  add column phone text,
  add column address text,
  add column city text,
  add column country text default 'Sénégal',
  add column registration_number text,
  add column sector text,
  add column description text;

comment on column public.organizations.phone is 'Telephone principal';
comment on column public.organizations.registration_number is 'NINEA, SIRET ou numero d''immatriculation';
comment on column public.organizations.sector is 'Secteur d''activite (ex: Conseil, Finance, Industrie)';
