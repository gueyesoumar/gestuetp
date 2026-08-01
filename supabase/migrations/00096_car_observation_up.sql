-- Migration: car_observation (UP)
-- Description: Étend chk_car_classification pour autoriser 'observation' en plus de major_nc/minor_nc.
-- Les observations sont des constats de moindre gravité mais qui méritent un suivi via le plan d'action.

ALTER TABLE public.corrective_action_requests
  DROP CONSTRAINT IF EXISTS chk_car_classification;

ALTER TABLE public.corrective_action_requests
  ADD CONSTRAINT chk_car_classification
  CHECK (finding_classification IN ('major_nc', 'minor_nc', 'observation'));
