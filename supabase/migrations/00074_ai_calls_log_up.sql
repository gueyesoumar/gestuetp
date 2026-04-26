-- Migration 00074: Log des appels IA pour monitoring & coûts (UP)
-- Description: Trace chaque appel à l'API Anthropic (smart-* + ai-documents)
-- pour permettre la page /admin/monitoring de calculer tokens consommés,
-- coûts estimés et taux d'échec par fonction et par cabinet.
--
-- Aucun contenu utilisateur (prompt, réponse) n'est stocké — uniquement
-- des métadonnées techniques.

CREATE TABLE public.ai_calls_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name       text NOT NULL,
  model               text,
  input_tokens        integer,
  output_tokens       integer,
  cost_estimate_usd   numeric(10, 6),
  success             boolean NOT NULL,
  error_message       text,
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  mission_id          uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  user_id             uuid REFERENCES public.users(id) ON DELETE SET NULL,
  duration_ms         integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_calls_log IS 'Trace des appels Anthropic. Métadonnées seulement, pas de contenu user.';
COMMENT ON COLUMN public.ai_calls_log.function_name IS 'Edge Function source: smart-questionnaire, smart-analyse, smart-plan, smart-risks, ai-documents';
COMMENT ON COLUMN public.ai_calls_log.cost_estimate_usd IS 'Coût estimé via constantes hardcodées (à mettre à jour si Anthropic change ses prix)';
COMMENT ON COLUMN public.ai_calls_log.error_message IS 'Tronqué à 500 caractères, pas de prompt user';

CREATE INDEX idx_aic_created ON public.ai_calls_log(created_at DESC);
CREATE INDEX idx_aic_org ON public.ai_calls_log(organization_id);
CREATE INDEX idx_aic_function_success ON public.ai_calls_log(function_name, success);

-- RLS — lecture pour les platform owners uniquement, insert via service-role only
ALTER TABLE public.ai_calls_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aic_owner_read"
  ON public.ai_calls_log FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());
