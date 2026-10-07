-- 00277 — Demande de preuve unique par preuve canonique (Lot E2).
-- Ajoute evidence_item_id sur mission_evidence_requests : une demande canonique
-- (une preuve mutualisée) couvre tous les contrôles liés. evidence_catalog_id est
-- conservé comme ligne REPRÉSENTATIVE (par contrôle) pour préserver les flux
-- decline / escalate / rappels qui restent rattachés à un contrôle.

alter table public.mission_evidence_requests
  add column if not exists evidence_item_id uuid references public.evidence_items(id) on delete set null;

create index if not exists idx_mer_evidence_item on public.mission_evidence_requests(evidence_item_id);

-- Unicité par preuve canonique (les lignes sans evidence_item_id — legacy / autres
-- référentiels — restent dédupliquées par (mission, evidence_catalog_id) existant ;
-- NULL non comparé en unicité, donc elles coexistent sans conflit).
create unique index if not exists uq_mer_mission_evidence_item
  on public.mission_evidence_requests(mission_id, evidence_item_id)
  where evidence_item_id is not null;

comment on column public.mission_evidence_requests.evidence_item_id is
  'Preuve canonique mutualisée : une demande couvre tous les contrôles liés (Lot E2).';
