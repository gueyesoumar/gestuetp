-- Rollback 00264 — retrait des policies DELETE sur public.documents.
drop policy if exists "documents_delete_team" on public.documents;
drop policy if exists "documents_delete_client" on public.documents;
