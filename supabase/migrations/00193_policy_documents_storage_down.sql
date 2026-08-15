-- 00193 — rollback : bucket policy-documents

DROP POLICY IF EXISTS "pold_read_org" ON storage.objects;
DROP POLICY IF EXISTS "pold_insert_org" ON storage.objects;
DROP POLICY IF EXISTS "pold_delete_org" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'policy-documents';
DELETE FROM storage.buckets WHERE id = 'policy-documents';
