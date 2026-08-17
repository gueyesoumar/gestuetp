-- 00193 — Gëstu Policy : bucket Storage PRIVÉ des politiques importées (documents
-- de gouvernance sensibles). Convention de chemin : <org_id>/<timestamp>_<nom>.
-- RLS org-scopée sur le premier segment du chemin ; jamais public, jamais client.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "pold_read_org" ON storage.objects;
CREATE POLICY "pold_read_org"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'policy-documents'
    AND (storage.foldername(name))[1] = public.get_my_organization_id()::text
    AND NOT public.is_client_role()
  );

DROP POLICY IF EXISTS "pold_insert_org" ON storage.objects;
CREATE POLICY "pold_insert_org"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'policy-documents'
    AND (storage.foldername(name))[1] = public.get_my_organization_id()::text
    AND NOT public.is_client_role()
  );

DROP POLICY IF EXISTS "pold_delete_org" ON storage.objects;
CREATE POLICY "pold_delete_org"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'policy-documents'
    AND (storage.foldername(name))[1] = public.get_my_organization_id()::text
    AND NOT public.is_client_role()
  );
