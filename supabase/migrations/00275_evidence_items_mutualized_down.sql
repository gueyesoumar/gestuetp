-- Rollback 00275 — retire le modèle mutualisé de preuves.
alter table public.assessment_findings drop column if exists evidence_item_id;
alter table public.documents drop column if exists evidence_item_id;
alter table public.evidence_catalog drop column if exists evidence_item_id;
drop table if exists public.evidence_items;
