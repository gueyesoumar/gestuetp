-- Migration: frameworks category (DOWN)

alter table public.frameworks drop column if exists category;
