-- Rollback 00268 — retire le marquage de constat systémique.

drop index if exists public.idx_findings_systemic_group;

alter table public.assessment_findings
  drop column if exists is_systemic_origin,
  drop column if exists systemic_group_id;
