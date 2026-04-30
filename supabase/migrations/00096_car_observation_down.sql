-- Migration: car_observation (DOWN)
-- Description: Retire 'observation' de chk_car_classification.
-- ATTENTION : si des CAR de type 'observation' existent, ce rollback échouera.
-- Il faut d'abord les supprimer ou les re-classifier en major_nc/minor_nc.

ALTER TABLE public.corrective_action_requests
  DROP CONSTRAINT IF EXISTS chk_car_classification;

ALTER TABLE public.corrective_action_requests
  ADD CONSTRAINT chk_car_classification
  CHECK (finding_classification IN ('major_nc', 'minor_nc'));
