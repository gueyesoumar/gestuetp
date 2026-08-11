-- Migration: documents_bucket_scope (DOWN)
-- ATTENTION : rétablit l'état VULNÉRABLE (bucket public + accès bucket_id-seul,
-- fuite cross-tenant + non authentifiée des preuves). Ne dérouler qu'en cas de
-- régression fonctionnelle avérée sur les uploads/downloads de documents.

drop policy if exists "documents_select_scoped" on storage.objects;
drop policy if exists "documents_insert_scoped" on storage.objects;
drop policy if exists "documents_update_scoped" on storage.objects;
drop policy if exists "documents_delete_scoped" on storage.objects;
drop function if exists public.can_access_document_object(text);

create policy "authenticated_read" on storage.objects for select to authenticated
  using (bucket_id = 'documents');
create policy "authenticated_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');

update storage.buckets set public = true where id = 'documents';
