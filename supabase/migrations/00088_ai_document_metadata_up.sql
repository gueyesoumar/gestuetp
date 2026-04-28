-- Migration 00088: Métadonnées IA structurées par document + kill switch cabinet — UP
--
-- Pose la fondation du nouveau pipeline d'analyse documentaire :
--   1) documents.ai_metadata jsonb — résultat de la "passe 1"
--      (extraction par doc : version, signatures, key_topics, formality_score…)
--   2) documents.ai_extracted_at + documents.ai_extract_error
--      pour distinguer "jamais analysé", "analysé OK" et "analysé en échec"
--   3) missions.ai_synthesis_cache + missions.ai_synthesis_at
--      pour cacher la "passe 2" (synthèse multi-doc) 24h
--   4) organizations.ai_analysis_enabled — kill switch cabinet
--      (cabinet sensible peut couper toute analyse IA pour ses missions)

-- ============================================================
-- 1. Colonnes IA par document
-- ============================================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb,
  ADD COLUMN IF NOT EXISTS ai_extracted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_extract_error text;

COMMENT ON COLUMN public.documents.ai_metadata IS
  'Métadonnées extraites par Claude (passe 1) : version, last_revision_date, signatures[], formality_score, scope_declared, key_topics[], page_count. NULL = jamais analysé.';
COMMENT ON COLUMN public.documents.ai_extracted_at IS
  'Date de dernière extraction réussie (passe 1).';
COMMENT ON COLUMN public.documents.ai_extract_error IS
  'Si l''extraction a échoué, code/message d''erreur (file_too_large, unsupported, parse_error, etc.).';

-- Index partiel pour retrouver rapidement les docs en attente d'extraction
CREATE INDEX IF NOT EXISTS idx_documents_ai_pending
  ON public.documents(mission_id)
  WHERE ai_extracted_at IS NULL AND ai_extract_error IS NULL;

-- ============================================================
-- 2. Cache de la synthèse mission (passe 2)
-- ============================================================
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS ai_synthesis_cache jsonb,
  ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;

COMMENT ON COLUMN public.missions.ai_synthesis_cache IS
  'Cache de la dernière synthèse multi-doc (passe 2). Contient les réponses pré-remplies au questionnaire avec evidence_type, confidence, source_documents.';
COMMENT ON COLUMN public.missions.ai_synthesis_at IS
  'Date de la synthèse cachée. Invalidée si nouveau document uploadé après cette date ou cache > 24h.';

-- ============================================================
-- 3. Kill switch cabinet
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ai_analysis_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organizations.ai_analysis_enabled IS
  'Kill switch cabinet : si false, aucune analyse IA n''est effectuée sur les missions de ce cabinet (extraction métadonnées + synthèse). Activé par défaut.';
