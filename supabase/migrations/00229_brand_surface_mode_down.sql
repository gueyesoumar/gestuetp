-- Migration 00229 (DOWN)
alter table public.organization_branding drop column if exists brand_surface_mode;
