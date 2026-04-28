-- Migration 00088: Métadonnées IA structurées par document + kill switch cabinet — DOWN

DROP INDEX IF EXISTS public.idx_documents_ai_pending;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS ai_metadata,
  DROP COLUMN IF EXISTS ai_extracted_at,
  DROP COLUMN IF EXISTS ai_extract_error;

ALTER TABLE public.missions
  DROP COLUMN IF EXISTS ai_synthesis_cache,
  DROP COLUMN IF EXISTS ai_synthesis_at;

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS ai_analysis_enabled;
