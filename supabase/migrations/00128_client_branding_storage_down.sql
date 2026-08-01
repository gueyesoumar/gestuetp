-- Migration 00128: Bucket Storage client-branding — DOWN

DROP POLICY IF EXISTS "clb_read_public" ON storage.objects;
DROP POLICY IF EXISTS "clb_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "clb_update_auth" ON storage.objects;
DROP POLICY IF EXISTS "clb_delete_auth" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'client-branding';
DELETE FROM storage.buckets WHERE id = 'client-branding';
