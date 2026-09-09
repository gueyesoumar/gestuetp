-- Migration 00228 (DOWN)
alter table public.organization_branding drop column if exists dark_logo_treatment;
