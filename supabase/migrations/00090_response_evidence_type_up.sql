-- Migration 00090: Persistance du type de preuve sur les réponses du questionnaire — UP
--
-- Quand le client valide une suggestion IA, on conserve désormais :
--   - evidence_type : qualité de la preuve telle que classée par la Passe 2
--     ('declared_only' | 'declared_with_doc' | 'declared_with_signed_doc')
--   - source_documents : noms des documents qui ont servi de source à la réponse
--   - ai_confidence : score 0-100 retourné par Claude
--
-- Permet à l'auditeur (ScopingQuestionnaireTab) de voir d'un coup d'œil
-- la qualité de la preuve apportée par le client, et de prioriser ses
-- contrôles sur les réponses faiblement étayées.

ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS evidence_type text,
  ADD COLUMN IF NOT EXISTS source_documents text[],
  ADD COLUMN IF NOT EXISTS ai_confidence smallint;

ALTER TABLE public.questionnaire_responses
  DROP CONSTRAINT IF EXISTS questionnaire_responses_evidence_type_check;
ALTER TABLE public.questionnaire_responses
  ADD CONSTRAINT questionnaire_responses_evidence_type_check
  CHECK (
    evidence_type IS NULL
    OR evidence_type IN ('declared_only', 'declared_with_doc', 'declared_with_signed_doc')
  );

ALTER TABLE public.questionnaire_responses
  DROP CONSTRAINT IF EXISTS questionnaire_responses_ai_confidence_check;
ALTER TABLE public.questionnaire_responses
  ADD CONSTRAINT questionnaire_responses_ai_confidence_check
  CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100));

COMMENT ON COLUMN public.questionnaire_responses.evidence_type IS
  'Type de preuve apportée par le client (issu de la Passe 2) : declared_only (déclaration sans doc), declared_with_doc (doc fourni mais informel), declared_with_signed_doc (doc signé/formel). NULL pour les réponses saisies manuellement sans suggestion IA.';
COMMENT ON COLUMN public.questionnaire_responses.source_documents IS
  'Noms des documents qui ont étayé la réponse (multi-sources possibles). NULL pour les réponses manuelles.';
COMMENT ON COLUMN public.questionnaire_responses.ai_confidence IS
  'Score de confiance 0-100 retourné par la Passe 2 si la réponse vient d''une suggestion IA.';
