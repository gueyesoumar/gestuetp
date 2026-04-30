-- Migration: supervision_cycles (DOWN)
-- ATTENTION : ce rollback supprime la table supervision_cycles ainsi que la colonne kind
-- sur missions et les colonnes cycle_id sur control_assessments et corrective_action_requests.
-- Si des cycles existent en production, ils seront perdus.

-- 1. Retirer les colonnes cycle_id (les FK font ON DELETE SET NULL donc on peut drop sans casser)
DROP INDEX IF EXISTS public.idx_car_cycle;
ALTER TABLE public.corrective_action_requests
  DROP COLUMN IF EXISTS cycle_id;

DROP INDEX IF EXISTS public.idx_control_assessments_cycle;
ALTER TABLE public.control_assessments
  DROP COLUMN IF EXISTS cycle_id;

-- 2. Supprimer la table supervision_cycles
DROP POLICY IF EXISTS "supervision_cycles_select" ON public.supervision_cycles;
DROP POLICY IF EXISTS "supervision_cycles_write" ON public.supervision_cycles;
DROP TRIGGER IF EXISTS trg_supervision_cycles_updated_at ON public.supervision_cycles;
DROP TABLE IF EXISTS public.supervision_cycles CASCADE;

-- 3. Retirer la colonne kind sur missions
ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS chk_missions_kind;
ALTER TABLE public.missions
  DROP COLUMN IF EXISTS kind;
