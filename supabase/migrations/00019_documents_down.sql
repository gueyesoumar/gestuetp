-- Migration: documents (DOWN)

drop policy if exists "documents_select_team" on public.documents;
drop policy if exists "documents_select_client" on public.documents;
drop policy if exists "documents_insert_client" on public.documents;
drop policy if exists "documents_insert_team" on public.documents;
drop table if exists public.documents cascade;
