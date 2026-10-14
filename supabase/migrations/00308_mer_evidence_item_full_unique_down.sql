-- Rollback de 00308 : restaure l'index unique PARTIEL d'origine (00277).
drop index if exists public.uq_mer_mission_evidence_item;

create unique index if not exists uq_mer_mission_evidence_item
  on public.mission_evidence_requests (mission_id, evidence_item_id)
  where evidence_item_id is not null;
