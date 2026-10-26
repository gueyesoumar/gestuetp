-- n°18 Lot 3a : « Lancer la revue ». Une mission de contrôle peut être la revue
-- d'une mission précédente (même assujetti + référentiel). Le lien permet de
-- retrouver l'évaluation N-1 contrôle par contrôle (panneau « Revue précédente »).
alter table public.missions
  add column if not exists review_of_mission_id uuid references public.missions(id) on delete set null;

create index if not exists idx_missions_review_of on public.missions(review_of_mission_id);

comment on column public.missions.review_of_mission_id is
  'Mission de contrôle précédente dont celle-ci est la revue périodique (n°18 Lot 3). NULL = mission ordinaire.';

-- Verdict d'évolution posé par l'évaluateur sur chaque contrôle d'une revue
-- (informatif, non bloquant) : identique à la revue précédente ou modifié.
alter table public.control_assessments
  add column if not exists review_delta text
  check (review_delta in ('unchanged', 'modified'));

comment on column public.control_assessments.review_delta is
  'Revue périodique (n°18 Lot 3b) : unchanged (sans changement) / modified (modifié) vs la revue précédente. NULL hors revue ou non tranché.';
