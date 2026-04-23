-- Migration: documents anthropic_file_id (UP)
-- Description: Ajouter le champ pour stocker le file_id Anthropic Files API

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS anthropic_file_id text,
  ADD COLUMN IF NOT EXISTS anthropic_file_uploaded_at timestamptz;

COMMENT ON COLUMN public.documents.anthropic_file_id IS 'Identifiant du fichier sur l''API Files Anthropic (beta). Permet de référencer le fichier dans les requêtes Claude sans re-upload.';
COMMENT ON COLUMN public.documents.anthropic_file_uploaded_at IS 'Date d''upload vers Anthropic. Les fichiers expirent après un certain temps et doivent être re-uploadés.';

CREATE INDEX IF NOT EXISTS idx_documents_anthropic_file_id ON public.documents(anthropic_file_id) WHERE anthropic_file_id IS NOT NULL;
