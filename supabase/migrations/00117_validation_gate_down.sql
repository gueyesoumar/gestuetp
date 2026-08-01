-- Migration: validation_gate (DOWN)
-- Rollback de 00117_validation_gate_up.sql

drop function if exists public.transition_mission_to_fieldwork(uuid);
