-- Migration: assessment_validations INSERT policy (UP)
-- Description: Permettre aux membres de la mission d'insérer des validations
-- Le contrôle métier (qui peut valider quoi) est géré côté application

CREATE POLICY "av_insert_mission_team"
  ON public.assessment_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    validated_by = public.get_my_user_id()
    AND EXISTS (
      SELECT 1 FROM public.control_assessments ca
      JOIN public.mission_members mm ON mm.mission_id = ca.mission_id
      WHERE ca.id = assessment_validations.assessment_id
        AND mm.user_id = public.get_my_user_id()
    )
  );
