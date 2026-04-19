-- Migration: Évolution cabinet_clients — client_org_id nullable + champs identification (UP)

-- 1. Rendre client_org_id nullable (l'organisation sera créée au lancement de mission)
alter table public.cabinet_clients
  alter column client_org_id drop not null;

-- 2. Ajouter les champs d'identification du client (pour déduplication)
alter table public.cabinet_clients
  add column client_name text not null default '',
  add column client_email_domain text,
  add column client_registration_number text,
  add column client_sector text,
  add column client_address text,
  add column client_city text,
  add column client_country text default 'Sénégal',
  add column client_website text,
  add column client_phone text;

-- 3. Supprimer la contrainte unique existante (cabinet_id, client_org_id)
--    et la remplacer par (cabinet_id, client_name) car client_org_id est maintenant nullable
alter table public.cabinet_clients
  drop constraint if exists cabinet_clients_cabinet_id_client_org_id_key;

alter table public.cabinet_clients
  add constraint cabinet_clients_cabinet_id_client_name_key unique(cabinet_id, client_name);

-- Index pour la déduplication au lancement de mission
create index idx_cabinet_clients_registration on public.cabinet_clients(client_registration_number) where client_registration_number is not null;
create index idx_cabinet_clients_email_domain on public.cabinet_clients(client_email_domain) where client_email_domain is not null;

comment on column public.cabinet_clients.client_org_id is 'Nullable — rempli automatiquement au lancement de la première mission';
comment on column public.cabinet_clients.client_name is 'Nom du client (renseigné par le cabinet)';
comment on column public.cabinet_clients.client_email_domain is 'Domaine email du client (ex: entreprise-x.com) — utilisé pour déduplication';
comment on column public.cabinet_clients.client_registration_number is 'NINEA, SIRET — utilisé pour déduplication cross-cabinets';
