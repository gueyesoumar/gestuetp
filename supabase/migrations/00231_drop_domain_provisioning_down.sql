-- Rollback : ré-ajoute les colonnes de provisionnement (additif, inoffensif).
alter table public.cabinet_domains
  add column if not exists vercel_registered boolean not null default false,
  add column if not exists dns_provisioned boolean not null default false,
  add column if not exists provision_error text;
