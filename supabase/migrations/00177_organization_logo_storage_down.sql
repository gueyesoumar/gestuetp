-- Migration 00177: Bucket Storage organization-logos — DOWN

DROP POLICY IF EXISTS "orglogo_read_public" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'organization-logos';
DELETE FROM storage.buckets WHERE id = 'organization-logos';
