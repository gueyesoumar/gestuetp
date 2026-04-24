-- Migration 00061: Table assessment_observations (UP)
-- Description: Le client peut poster des observations non bloquantes sur les constats.
-- L'auditeur y répond et décide de modifier ou conserver le constat.

CREATE TYPE public.observation_response_action AS ENUM ('modified', 'kept');

CREATE TABLE public.assessment_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.control_assessments(id) ON DELETE CASCADE,
  observation_text text NOT NULL,
  observation_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  observation_at timestamptz NOT NULL DEFAULT now(),
  response_text text,
  response_action public.observation_response_action,
  response_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_observations_assessment ON public.assessment_observations(assessment_id);
CREATE INDEX idx_observations_pending ON public.assessment_observations(assessment_id) WHERE response_text IS NULL;

CREATE TRIGGER trg_observations_updated_at
  BEFORE UPDATE ON public.assessment_observations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.assessment_observations ENABLE ROW LEVEL SECURITY;

-- SELECT : le client de la mission voit les observations de ses missions
CREATE POLICY "obs_select_client"
  ON public.assessment_observations FOR SELECT
  TO authenticated
  USING (
    public.is_client_role()
    AND assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      WHERE ca.mission_id IN (SELECT public.get_my_client_mission_ids())
    )
  );

-- SELECT : l'équipe de la mission voit les observations
CREATE POLICY "obs_select_mission_team"
  ON public.assessment_observations FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      WHERE ca.mission_id IN (SELECT public.get_my_mission_ids())
    )
  );

-- SELECT : le cabinet de la mission voit les observations
CREATE POLICY "obs_select_cabinet"
  ON public.assessment_observations FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      JOIN public.missions m ON m.id = ca.mission_id
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  );

-- INSERT : client avec permission contributor peut poster des observations
CREATE POLICY "obs_insert_client"
  ON public.assessment_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client_role()
    AND observation_by = public.get_my_user_id()
    AND assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      WHERE ca.mission_id IN (
        SELECT cma.mission_id FROM public.client_mission_access cma
        JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
        WHERE cpc.user_id = public.get_my_user_id()
          AND cma.permission = 'contributor'
      )
    )
  );

-- UPDATE : l'équipe de la mission (cabinet) peut ajouter une réponse
CREATE POLICY "obs_update_mission_team"
  ON public.assessment_observations FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      JOIN public.missions m ON m.id = ca.mission_id
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT ca.id FROM public.control_assessments ca
      JOIN public.missions m ON m.id = ca.mission_id
      WHERE m.cabinet_id = public.get_my_organization_id()
    )
  );
