-- Migration 00153 (DOWN) : rollback du cloisonnement Storage client-branding
-- Restaure les policies d'écriture permissives d'origine (état 00128,
-- scopées au seul bucket_id).

DROP POLICY IF EXISTS "clb_insert_own_cabinet" ON storage.objects;
CREATE POLICY "clb_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-branding');

DROP POLICY IF EXISTS "clb_update_own_cabinet" ON storage.objects;
CREATE POLICY "clb_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-branding')
  WITH CHECK (bucket_id = 'client-branding');

DROP POLICY IF EXISTS "clb_delete_own_cabinet" ON storage.objects;
CREATE POLICY "clb_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-branding');
