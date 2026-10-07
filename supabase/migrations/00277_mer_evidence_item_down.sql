-- Rollback 00277 — retire evidence_item_id de mission_evidence_requests.
drop index if exists public.uq_mer_mission_evidence_item;
drop index if exists public.idx_mer_evidence_item;
alter table public.mission_evidence_requests drop column if exists evidence_item_id;
