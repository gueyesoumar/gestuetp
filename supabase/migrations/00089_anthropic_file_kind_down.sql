-- Migration 00089: Type d'asset Anthropic par document — DOWN

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_anthropic_file_kind_check;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS anthropic_file_kind;
