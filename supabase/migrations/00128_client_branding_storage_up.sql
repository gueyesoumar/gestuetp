-- Migration 00128: Bucket Storage client-branding — UP
-- Description: Bucket public dédié aux logos des clients (affichés dans les
-- rapports d'audit et le portail client — donnée non sensible). Le bucket
-- cabinet-branding (00079) ne convient pas : MIME limité à png/svg, aucune
-- policy d'écriture authenticated (écritures via Edge Function service-role).
--
-- Path convention: client-branding/client-logos/<client_id>/<timestamp>_<name>
-- SVG volontairement EXCLU des MIME autorisés : l'upload est direct (sans
-- sanitization côté serveur), donc on évite tout vecteur XSS via SVG.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-branding',
  'client-branding',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique (logos affichés dans les rapports PDF et le portail client)
DROP POLICY IF EXISTS "clb_read_public" ON storage.objects;
CREATE POLICY "clb_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'client-branding');

-- Écriture réservée aux utilisateurs authentifiés (logos non sensibles).
DROP POLICY IF EXISTS "clb_insert_auth" ON storage.objects;
CREATE POLICY "clb_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-branding');

DROP POLICY IF EXISTS "clb_update_auth" ON storage.objects;
CREATE POLICY "clb_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-branding')
  WITH CHECK (bucket_id = 'client-branding');

DROP POLICY IF EXISTS "clb_delete_auth" ON storage.objects;
CREATE POLICY "clb_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-branding');
