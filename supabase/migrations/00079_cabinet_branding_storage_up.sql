-- Migration 00079: Bucket Storage cabinet-branding — UP
-- Description: Bucket public dédié pour les logos de marque blanche
-- (logo_light + logo_dark). Lecture publique car la page de login
-- non-authentifiée doit pouvoir afficher le logo cabinet selon le hostname.
--
-- Path convention: cabinet-branding/<cabinet_id>/logo-light-<timestamp>.<ext>
-- Limites côté Edge Function upload-cabinet-logo : 500 Ko, MIME ∈ {png, svg+xml},
-- SVG sanitizé (pas de <script>, <foreignObject>, attrs on*).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cabinet-branding',
  'cabinet-branding',
  true,
  524288,
  ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique (logos affichés sur login non-auth, hub, emails)
DROP POLICY IF EXISTS "cb_read_public" ON storage.objects;
CREATE POLICY "cb_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'cabinet-branding');

-- Aucune policy INSERT/UPDATE/DELETE pour anon/authenticated : toutes les
-- écritures passent par l'Edge Function upload-cabinet-logo en service-role,
-- avec validation MIME, taille, sanitization SVG, et audit log.
