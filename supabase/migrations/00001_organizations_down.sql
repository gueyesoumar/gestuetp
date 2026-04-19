-- Migration: organizations (DOWN)

drop trigger if exists trg_organizations_updated_at on public.organizations;
drop policy if exists "organizations_select_authenticated" on public.organizations;
-- organizations_update_members est dans 00006_rls_policies_down.sql
drop table if exists public.organizations cascade;
-- Note: set_updated_at() est reutilise par d'autres tables, on ne le drop pas ici
