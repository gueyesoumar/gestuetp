-- Migration: frameworks (DOWN)

drop trigger if exists trg_frameworks_updated_at on public.frameworks;
drop policy if exists "frameworks_select_authenticated" on public.frameworks;
drop table if exists public.frameworks cascade;
