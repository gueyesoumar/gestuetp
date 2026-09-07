-- Migration 00222 (DOWN) — P1c.2 (RFC 0007).
-- Ré-ajoute les colonnes d'identité et les repeuple depuis le nœud organizations.

drop index if exists public.uq_cabinet_client_org;

alter table public.cabinet_clients
  add column if not exists client_name text not null default '',
  add column if not exists client_registration_number text,
  add column if not exists client_sector text,
  add column if not exists client_address text,
  add column if not exists client_city text,
  add column if not exists client_country text,
  add column if not exists client_website text,
  add column if not exists client_phone text,
  add column if not exists logo_url text;

update public.cabinet_clients cc
set client_name = coalesce(o.name, ''),
    client_registration_number = o.registration_number,
    client_sector = o.sector,
    client_address = o.address,
    client_city = o.city,
    client_country = o.country,
    client_website = o.website,
    client_phone = o.phone,
    logo_url = o.logo_url
from public.organizations o
where o.id = cc.client_org_id;
