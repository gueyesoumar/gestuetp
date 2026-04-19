-- Migration: domains (DOWN)

drop trigger if exists trg_domains_updated_at on public.domains;
drop policy if exists "domains_select_authenticated" on public.domains;
drop table if exists public.domains cascade;
