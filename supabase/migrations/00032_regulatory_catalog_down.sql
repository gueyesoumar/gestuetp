-- Migration: regulatory_catalog (DOWN)

drop trigger if exists trg_regulatory_catalog_updated_at on public.regulatory_catalog;
drop policy if exists "regulatory_catalog_select_authenticated" on public.regulatory_catalog;
drop table if exists public.regulatory_catalog cascade;
