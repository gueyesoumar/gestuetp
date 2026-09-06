-- Migration 00220 (DOWN) — P2.2b (RFC 0007).
-- Ré-ajoute les colonnes polymorphes (nullable) + backfill depuis client_org_id.
-- Comply : cabinet_client_id = la fiche du cabinet auditeur (best-effort, une fiche
-- si le client est audité par plusieurs cabinets). Regul : entity_org_id = client_org_id.
-- Le CHECK XOR n'est PAS restauré (les deux chemins peuvent coexister transitoirement).

drop index if exists public.uq_cpc_client_org_email;

alter table public.client_portal_contacts
  add column if not exists cabinet_client_id uuid references public.cabinet_clients(id) on delete cascade,
  add column if not exists entity_org_id uuid references public.organizations(id) on delete cascade;

-- Regul : entity_org_id = client_org_id si aucune fiche cabinet ne correspond.
-- Comply : cabinet_client_id = une fiche dont client_org_id correspond.
update public.client_portal_contacts cpc
set cabinet_client_id = (
  select cc.id from public.cabinet_clients cc where cc.client_org_id = cpc.client_org_id limit 1
)
where exists (select 1 from public.cabinet_clients cc where cc.client_org_id = cpc.client_org_id);

update public.client_portal_contacts cpc
set entity_org_id = cpc.client_org_id
where cpc.cabinet_client_id is null;

create unique index if not exists uq_portal_contact_entity_email
  on public.client_portal_contacts(entity_org_id, email) where entity_org_id is not null;
