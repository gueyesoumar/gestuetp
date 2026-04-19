-- Migration: Évolution cabinet_clients v2 (DOWN)

drop index if exists idx_cabinet_clients_registration;
drop index if exists idx_cabinet_clients_email_domain;

alter table public.cabinet_clients
  drop constraint if exists cabinet_clients_cabinet_id_client_name_key;

alter table public.cabinet_clients
  drop column if exists client_name,
  drop column if exists client_email_domain,
  drop column if exists client_registration_number,
  drop column if exists client_sector,
  drop column if exists client_address,
  drop column if exists client_city,
  drop column if exists client_country,
  drop column if exists client_website,
  drop column if exists client_phone;

alter table public.cabinet_clients
  alter column client_org_id set not null;

alter table public.cabinet_clients
  add constraint cabinet_clients_cabinet_id_client_org_id_key unique(cabinet_id, client_org_id);
