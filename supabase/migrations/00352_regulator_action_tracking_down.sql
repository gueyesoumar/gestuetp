-- Migration: 00352_regulator_action_tracking_down
-- Rollback de 00352_regulator_action_tracking_up : supprime la fonction d'agregation.

drop function if exists public.get_regulator_action_tracking(uuid);
