-- Migration 00164 (DOWN) : retire le maintien automatique du graphe/capacités.
drop trigger if exists trg_sync_org_capabilities on public.organizations;
drop trigger if exists trg_sync_org_parent_edge on public.organizations;
drop function if exists public.sync_org_capabilities();
drop function if exists public.sync_org_parent_edge();
