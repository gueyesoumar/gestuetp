-- Migration: documents anthropic_file_id (DOWN)
DROP INDEX IF EXISTS idx_documents_anthropic_file_id;
ALTER TABLE public.documents
  DROP COLUMN IF EXISTS anthropic_file_id,
  DROP COLUMN IF EXISTS anthropic_file_uploaded_at;
