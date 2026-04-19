-- Migration: Catalogue de preuves et liaison documents (DOWN)

alter table public.documents
  drop column if exists control_id,
  drop column if exists evidence_request_id;

drop policy if exists "mer_select_team" on public.mission_evidence_requests;
drop policy if exists "mer_select_client" on public.mission_evidence_requests;
drop table if exists public.mission_evidence_requests cascade;

drop trigger if exists trg_evidence_catalog_updated_at on public.evidence_catalog;
drop policy if exists "evidence_catalog_select_authenticated" on public.evidence_catalog;
drop table if exists public.evidence_catalog cascade;
