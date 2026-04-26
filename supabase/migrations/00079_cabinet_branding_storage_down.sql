-- Migration 00079: Bucket Storage cabinet-branding — DOWN

DROP POLICY IF EXISTS "cb_read_public" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'cabinet-branding';
DELETE FROM storage.buckets WHERE id = 'cabinet-branding';
