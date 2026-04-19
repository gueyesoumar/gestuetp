-- Migration: Informations complementaires organizations (DOWN)

alter table public.organizations
  drop column if exists phone,
  drop column if exists address,
  drop column if exists city,
  drop column if exists country,
  drop column if exists registration_number,
  drop column if exists sector,
  drop column if exists description;
