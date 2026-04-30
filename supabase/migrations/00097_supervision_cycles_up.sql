-- Migration: supervision_cycles (UP)
-- Description: Ajoute le concept de "supervision continue" en parallèle des audits ponctuels.
-- Une mission peut être de kind='audit' (cycle classique en 6 phases avec rapport signé) ou
-- de kind='continuous_supervision' (cycles trimestriels qui se renouvellent en continu).
-- Les évaluations et CAR peuvent être rattachées à un cycle pour tracer la périodicité.

-- 1. Colonne kind sur missions (par défaut 'audit' → toutes les missions existantes restent inchangées)
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'audit';

ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS chk_missions_kind;

ALTER TABLE public.missions
  ADD CONSTRAINT chk_missions_kind CHECK (kind IN ('audit', 'continuous_supervision'));

COMMENT ON COLUMN public.missions.kind IS 'Type d''engagement : audit (ponctuel, cycle classique) ou continuous_supervision (cycles trimestriels en continu)';

-- 2. Table supervision_cycles
CREATE TABLE IF NOT EXISTS public.supervision_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  score integer,
  conformity_summary jsonb,
  lead_auditor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.users(id),
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_cycle_status CHECK (status IN ('planned', 'in_progress', 'closed')),
  CONSTRAINT chk_cycle_score CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT chk_cycle_period CHECK (period_end >= period_start)
);

COMMENT ON TABLE public.supervision_cycles IS 'Cycles trimestriels d''une mission de supervision continue';
COMMENT ON COLUMN public.supervision_cycles.period_label IS 'Étiquette lisible du cycle (ex: "Q2 2026", "Audit annuel 2026")';
COMMENT ON COLUMN public.supervision_cycles.conformity_summary IS 'Snapshot du score et des compteurs au moment de la clôture';

CREATE INDEX IF NOT EXISTS idx_supervision_cycles_mission ON public.supervision_cycles(mission_id);
CREATE INDEX IF NOT EXISTS idx_supervision_cycles_status ON public.supervision_cycles(status);
CREATE INDEX IF NOT EXISTS idx_supervision_cycles_period_end ON public.supervision_cycles(period_end);

CREATE TRIGGER trg_supervision_cycles_updated_at
  BEFORE UPDATE ON public.supervision_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. RLS — accès pour les membres de la mission, mutations réservées au lead/associate
ALTER TABLE public.supervision_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supervision_cycles_select" ON public.supervision_cycles;
CREATE POLICY "supervision_cycles_select"
  ON public.supervision_cycles FOR SELECT
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()));

DROP POLICY IF EXISTS "supervision_cycles_write" ON public.supervision_cycles;
CREATE POLICY "supervision_cycles_write"
  ON public.supervision_cycles FOR ALL
  TO authenticated
  USING (
    mission_id IN (
      SELECT id FROM public.missions
      WHERE lead_auditor_id = public.get_my_user_id()
         OR associate_id = public.get_my_user_id()
    )
  )
  WITH CHECK (
    mission_id IN (
      SELECT id FROM public.missions
      WHERE lead_auditor_id = public.get_my_user_id()
         OR associate_id = public.get_my_user_id()
    )
  );

-- 4. Lien cycle ↔ assessment / CAR (nullable : seules les missions continuous_supervision l'utilisent)
ALTER TABLE public.control_assessments
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.supervision_cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_control_assessments_cycle ON public.control_assessments(cycle_id);

ALTER TABLE public.corrective_action_requests
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.supervision_cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_car_cycle ON public.corrective_action_requests(cycle_id);

COMMENT ON COLUMN public.control_assessments.cycle_id IS 'Cycle de supervision auquel cette évaluation appartient (NULL pour les missions kind=audit)';
COMMENT ON COLUMN public.corrective_action_requests.cycle_id IS 'Cycle de supervision dans lequel ce constat a été levé (NULL pour les missions kind=audit)';
