-- Migration: interview_pv (DOWN)
-- Rollback de 00114_interview_pv_up.sql

alter table public.interview_schedules
  drop column if exists pv_notes,
  drop column if exists pv_template;

alter table public.audit_topics
  drop column if exists default_questions;
