-- Rollback 00263 — ne supprime le bucket `documents` QUE s'il est vide
-- (ne jamais détruire des preuves réelles au rollback). No-op s'il contient des objets.
delete from storage.buckets b
where b.id = 'documents'
  and not exists (select 1 from storage.objects o where o.bucket_id = 'documents');
