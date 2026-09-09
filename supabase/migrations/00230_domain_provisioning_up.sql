-- Provisionnement automatique des domaines custom (Vercel + OVH).
-- Colonnes additives sur cabinet_domains pour tracer l'état de provisionnement
-- indépendamment de la vérification DNS (is_verified/ssl_status déjà présents).
--   vercel_registered : le hostname est enregistré sur le projet Vercel (SSL auto)
--   dns_provisioned   : les enregistrements DNS (CNAME + TXT) ont été créés via OVH
--   provision_error   : dernier message d'erreur de provisionnement (null si OK)

alter table public.cabinet_domains
  add column if not exists vercel_registered boolean not null default false,
  add column if not exists dns_provisioned boolean not null default false,
  add column if not exists provision_error text;
