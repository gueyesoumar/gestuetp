-- Migration: audit_checklist (DOWN)
-- Description: Rollback de 00101_audit_checklist_up.sql.

alter table public.controls
  drop constraint if exists chk_audit_checklist_is_array;

alter table public.controls
  drop column if exists audit_checklist;
