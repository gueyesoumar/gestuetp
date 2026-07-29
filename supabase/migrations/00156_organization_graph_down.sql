-- Migration 00156 (DOWN) : rollback du graphe relationnel (RFC 0001, étape 1)
-- Retire la colonne, les tables et les enums. Sans effet de bord : rien d'autre
-- ne les référence en étape 1 (aucun backfill, aucune bascule RLS).

alter table public.missions drop column if exists engagement_id;

drop table if exists public.organization_capabilities;
drop table if exists public.organization_relationships;

drop type if exists public.capability_status;
drop type if exists public.org_capability;
drop type if exists public.relationship_status;
drop type if exists public.relationship_nature;
