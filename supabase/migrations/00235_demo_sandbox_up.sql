-- Migration 00235: Bac à sable / données de démonstration (E4) — socle (UP)
-- Description: marque les missions et fiches clients de démonstration, par
-- utilisateur (demo_owner_id). Ces données sont exclues des indicateurs (score
-- de confiance, dashboards, quota) et supprimables en un clic par leur
-- propriétaire. is_demo n'est PAS une frontière de sécurité (RLS cabinet
-- inchangée) : c'est un marqueur UX/analytics.

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS is_demo       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.cabinet_clients
  ADD COLUMN IF NOT EXISTS is_demo       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.missions.is_demo IS 'Mission de démonstration (bac à sable E4) : exclue des indicateurs et du quota.';
COMMENT ON COLUMN public.missions.demo_owner_id IS 'Propriétaire du bac à sable (démo par utilisateur). NULL hors démo.';
COMMENT ON COLUMN public.cabinet_clients.is_demo IS 'Fiche client de démonstration (bac à sable E4).';
COMMENT ON COLUMN public.cabinet_clients.demo_owner_id IS 'Propriétaire du bac à sable. NULL hors démo.';

-- Index partiels : filtrer/retrouver la démo d'un utilisateur sans peser sur le reste.
CREATE INDEX IF NOT EXISTS idx_missions_demo_owner        ON public.missions(demo_owner_id)        WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_cabinet_clients_demo_owner ON public.cabinet_clients(demo_owner_id) WHERE is_demo;
