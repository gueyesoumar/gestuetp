-- Migration 00218 (DOWN) — P2.1 (RFC 0007).
-- Colonne additive ; sa suppression ne perd rien tant que P2.2 n'a pas basculé la
-- RLS dessus. À NE PAS jouer après P2.2.

drop index if exists public.idx_cpc_client_org;
alter table public.client_portal_contacts drop column if exists client_org_id;
