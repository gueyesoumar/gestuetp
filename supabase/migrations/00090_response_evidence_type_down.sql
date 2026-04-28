-- Migration 00090: Persistance du type de preuve sur les réponses du questionnaire — DOWN

ALTER TABLE public.questionnaire_responses
  DROP CONSTRAINT IF EXISTS questionnaire_responses_ai_confidence_check;
ALTER TABLE public.questionnaire_responses
  DROP CONSTRAINT IF EXISTS questionnaire_responses_evidence_type_check;

ALTER TABLE public.questionnaire_responses
  DROP COLUMN IF EXISTS ai_confidence,
  DROP COLUMN IF EXISTS source_documents,
  DROP COLUMN IF EXISTS evidence_type;
