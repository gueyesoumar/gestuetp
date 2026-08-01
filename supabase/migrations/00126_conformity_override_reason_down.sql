-- Migration: conformity_override_reason (DOWN)
-- Rollback de 00126_conformity_override_reason_up.sql

alter table public.control_assessments
  drop column if exists conformity_override_reason;
