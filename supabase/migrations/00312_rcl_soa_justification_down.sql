-- Rollback 00312.
alter table public.risk_control_links drop column if exists applicability_justification;
