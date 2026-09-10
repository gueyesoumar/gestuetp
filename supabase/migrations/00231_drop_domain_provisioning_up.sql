-- Retrait des colonnes de provisionnement par domaine (Vercel/OVH), devenues
-- inutiles : l'architecture retenue est un domaine wildcard *.gestugroup.com
-- (SSL via délégation _acme-challenge) + le middleware edge qui filtre par
-- cabinet_domains vérifié. Plus aucun provisionnement par domaine.
--
-- Idempotent : droppe sur snayz (où 00230 avait ajouté les colonnes), no-op
-- sur prod (jamais appliqué 00230).

alter table public.cabinet_domains
  drop column if exists vercel_registered,
  drop column if exists dns_provisioned,
  drop column if exists provision_error;
