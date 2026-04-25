-- Migration 00062: Table mission_evidence_overrides (UP)
-- Description: Permet à l'auditeur de marquer une preuve comme "essentielle"
-- spécifiquement pour une mission, surchargeant le flag is_required du catalogue.

CREATE TABLE public.mission_evidence_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  evidence_name text NOT NULL,
  is_essential boolean NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mission_id, evidence_name)
);

CREATE INDEX idx_evidence_overrides_mission ON public.mission_evidence_overrides(mission_id);

CREATE TRIGGER trg_evidence_overrides_updated_at
  BEFORE UPDATE ON public.mission_evidence_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.mission_evidence_overrides ENABLE ROW LEVEL SECURITY;

-- SELECT : équipe mission ou cabinet
CREATE POLICY "meo_select_team"
  ON public.mission_evidence_overrides FOR SELECT
  TO authenticated
  USING (
    mission_id IN (SELECT public.get_my_mission_ids())
    OR mission_id IN (
      SELECT m.id FROM public.missions m
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  );

-- SELECT : client de la mission peut aussi voir (pour cohérence d'affichage si on en a besoin)
CREATE POLICY "meo_select_client"
  ON public.mission_evidence_overrides FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (SELECT public.get_my_client_mission_ids())
  );

-- INSERT/UPDATE/DELETE : uniquement le cabinet de la mission
CREATE POLICY "meo_insert_cabinet"
  ON public.mission_evidence_overrides FOR INSERT
  TO authenticated
  WITH CHECK (
    mission_id IN (
      SELECT m.id FROM public.missions m
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "meo_update_cabinet"
  ON public.mission_evidence_overrides FOR UPDATE
  TO authenticated
  USING (
    mission_id IN (
      SELECT m.id FROM public.missions m
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    mission_id IN (
      SELECT m.id FROM public.missions m
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "meo_delete_cabinet"
  ON public.mission_evidence_overrides FOR DELETE
  TO authenticated
  USING (
    mission_id IN (
      SELECT m.id FROM public.missions m
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  );
