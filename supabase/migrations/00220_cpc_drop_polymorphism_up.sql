-- Migration 00220 (UP) — P2.2b (RFC 0007) : retrait du polymorphisme cpc.
-- La RLS (00219) et tous les lecteurs (edge + front) sont passés sur client_org_id.
-- On retire les anciennes colonnes + le CHECK XOR + les anciens uniques, et on pose
-- l'unicité sur la colonne unifiée. Purement soustractif.

alter table public.client_portal_contacts
  drop constraint if exists chk_portal_contact_scope;

-- Le drop des colonnes retire en cascade leurs FK et index uniques dépendants
-- (uq_portal_contact_email sur cabinet_client_id, uq_portal_contact_entity_email
-- sur entity_org_id, idx_cpc_entity_org).
alter table public.client_portal_contacts drop column if exists cabinet_client_id;
alter table public.client_portal_contacts drop column if exists entity_org_id;

-- Unicité de l'email par organisation auditée (pendant unifié des anciens uniques).
create unique index if not exists uq_cpc_client_org_email
  on public.client_portal_contacts(client_org_id, email);
