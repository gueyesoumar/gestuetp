-- Migration 00089: Type d'asset Anthropic par document — UP
--
-- Le pipeline IA accepte maintenant deux types d'assets côté Files API :
--   - 'document' : PDF, TXT, CSV, HTML (et DOCX/XLSX convertis serveur)
--   - 'image'    : PNG, JPG, JPEG, WEBP
--
-- Cette colonne dit au handleAnalyze quel content block construire :
--   { type: 'document', source: { type: 'file', file_id } }
--   { type: 'image',    source: { type: 'file', file_id } }
--
-- Sans cette info l'analyse échoue silencieusement sur les images
-- (Anthropic renvoie un format error 400).

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS anthropic_file_kind text;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_anthropic_file_kind_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_anthropic_file_kind_check
  CHECK (anthropic_file_kind IS NULL OR anthropic_file_kind IN ('document', 'image'));

COMMENT ON COLUMN public.documents.anthropic_file_kind IS
  'Type d''asset Anthropic Files API : ''document'' (PDF/TXT/CSV/HTML/DOCX→TXT/XLSX→CSV) ou ''image'' (PNG/JPG/WEBP). NULL = jamais uploadé vers Anthropic.';
