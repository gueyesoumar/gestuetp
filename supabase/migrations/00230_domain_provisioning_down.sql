-- Rollback : retire les colonnes de provisionnement.
alter table public.cabinet_domains
  drop column if exists vercel_registered,
  drop column if exists dns_provisioned,
  drop column if exists provision_error;
