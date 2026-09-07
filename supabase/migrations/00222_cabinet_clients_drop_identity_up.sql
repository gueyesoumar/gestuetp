-- Migration 00222 (UP) — P1c.2 (RFC 0007) : dé-duplication de l'IDENTITÉ.
-- L'identité vit désormais sur le nœud organizations (peuplé par create-client/P1a) ;
-- tous les lecteurs (front + edge) et update-client ont été repointés dessus.
-- On retire les colonnes d'identité dupliquées de cabinet_clients. La table reste un
-- SQUELETTE (id, cabinet_id, client_org_id, client_email_domain, branding, timestamps)
-- — id conservé (FK audit_history.cabinet_client_id). Purement soustractif.

-- La contrainte unique (cabinet_id, client_name) disparaît avec client_name ; on la
-- remplace par (cabinet_id, client_org_id) — une fiche par client de ce cabinet.
alter table public.cabinet_clients
  drop constraint if exists cabinet_clients_cabinet_id_client_name_key;

alter table public.cabinet_clients
  drop column if exists client_name,
  drop column if exists client_registration_number,
  drop column if exists client_sector,
  drop column if exists client_address,
  drop column if exists client_city,
  drop column if exists client_country,
  drop column if exists client_website,
  drop column if exists client_phone,
  drop column if exists logo_url;

create unique index if not exists uq_cabinet_client_org
  on public.cabinet_clients(cabinet_id, client_org_id);
