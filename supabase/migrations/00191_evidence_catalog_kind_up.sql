-- 00191 — Gëstu Policy : typer les preuves attendues pour dériver le jeu de
-- POLITIQUES requises par référentiel (carte de couverture). Une preuve attendue
-- de type `policy` doit être satisfaite par une politique du registre Gëstu Policy.

alter table public.evidence_catalog
  add column if not exists kind text not null default 'document'
  check (kind in ('document', 'policy', 'record', 'config'));

comment on column public.evidence_catalog.kind is
  'Type de preuve attendue. `policy` = doit être couverte par une politique (Gëstu Policy).';
