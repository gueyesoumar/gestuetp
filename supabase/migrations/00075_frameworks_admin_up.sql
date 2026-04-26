-- Migration 00075: Soft-delete sur domains/controls + flag IA sur frameworks (UP)
-- Description: Ajoute is_active sur domains et controls (déjà présent sur frameworks)
-- pour permettre le soft-delete depuis l'admin sans casser les missions existantes.
-- Ajoute was_ai_generated sur frameworks pour tracer les drafts générés par IA.

ALTER TABLE public.domains
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.controls
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.frameworks
  ADD COLUMN was_ai_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.domains.is_active IS 'Soft-delete flag — false = invisible côté cabinet, missions existantes intactes';
COMMENT ON COLUMN public.controls.is_active IS 'Soft-delete flag — false = invisible côté cabinet, control_assessments intacts';
COMMENT ON COLUMN public.frameworks.was_ai_generated IS 'true si le squelette a été généré par admin-framework-ai-draft (badge brouillon IA)';

CREATE INDEX idx_domains_active ON public.domains(framework_id) WHERE is_active = true;
CREATE INDEX idx_controls_active ON public.controls(domain_id) WHERE is_active = true;
