-- Migration 00177: Bucket Storage organization-logos — UP
-- Description: Bucket public dédié au logo d'IDENTITÉ d'une organisation
-- (organizations.logo_url), affiché dans le Hub. Distinct du bucket
-- cabinet-branding (marque blanche, super-admin). En self-service : écrit par
-- l'admin d'org via l'Edge Function upload-org-logo (service_role).
--
-- Path convention : organization-logos/<org_id>/logo-<timestamp>.<ext>
-- Limites côté Edge Function : 500 Ko, MIME ∈ {png, svg+xml}, SVG sanitizé.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  524288,
  ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique (logo affiché dans le Hub, potentiellement emails/fiches).
DROP POLICY IF EXISTS "orglogo_read_public" ON storage.objects;
CREATE POLICY "orglogo_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'organization-logos');

-- Aucune policy INSERT/UPDATE/DELETE pour anon/authenticated : toutes les
-- écritures passent par l'Edge Function upload-org-logo en service_role
-- (validation MIME, taille, sanitization SVG, cloisonnement à l'org appelante).
