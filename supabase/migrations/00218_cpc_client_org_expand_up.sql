-- Migration 00218 (UP) — P2.1 (RFC 0007) : dé-polymorphisation de
-- client_portal_contacts, phase EXPAND (purement additive).
-- Ajoute une colonne unifiée client_org_id → organizations(id) (la partie auditée
-- = un nœud, depuis P1a). Backfill depuis les deux anciens chemins. AUCUNE policy
-- modifiée, AUCUNE colonne retirée, PAS de NOT NULL : le modèle actuel
-- (cabinet_client_id XOR entity_org_id) reste la source de vérité RLS jusqu'à P2.2.

alter table public.client_portal_contacts
  add column if not exists client_org_id uuid references public.organizations(id) on delete cascade;

comment on column public.client_portal_contacts.client_org_id is
  'RFC 0007 P2 : organisation auditee unifiee (remplace cabinet_client_id XOR entity_org_id). Source RLS a partir de P2.2.';

-- Backfill Comply : via cabinet_client_id → cabinet_clients.client_org_id.
update public.client_portal_contacts cpc
set client_org_id = cc.client_org_id
from public.cabinet_clients cc
where cpc.cabinet_client_id = cc.id
  and cpc.client_org_id is null
  and cc.client_org_id is not null;

-- Backfill Regul : entity_org_id EST déjà une organisation.
update public.client_portal_contacts
set client_org_id = entity_org_id
where entity_org_id is not null and client_org_id is null;

create index if not exists idx_cpc_client_org
  on public.client_portal_contacts(client_org_id) where client_org_id is not null;
