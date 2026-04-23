-- Migration: fix lead-submitted assessments (UP)
-- Description: Les contrôles soumis par le chef de mission lui-même
-- doivent passer de 'submitted' à 'in_review' pour être validés par l'associé.
-- Corrige les contrôles soumis avant le changement de workflow.

-- Étape 1 : Créer les entrées lead_review automatiques pour ces contrôles
INSERT INTO public.assessment_validations (assessment_id, stage, decision, comment, validated_by)
SELECT ca.id, 'lead_review', 'approved',
       'Validation automatique — constat soumis par le chef de mission lui-même (migration)',
       m.lead_auditor_id
FROM public.control_assessments ca
JOIN public.missions m ON ca.mission_id = m.id
WHERE ca.auditor_id = m.lead_auditor_id
  AND ca.status IN ('submitted', 'in_review')
  AND m.associate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.assessment_validations av
    WHERE av.assessment_id = ca.id AND av.stage = 'lead_review'
  );

-- Étape 2 : Passer le statut à in_review
UPDATE public.control_assessments ca
SET status = 'in_review'
FROM public.missions m
WHERE ca.mission_id = m.id
  AND ca.auditor_id = m.lead_auditor_id
  AND ca.status = 'submitted'
  AND m.associate_id IS NOT NULL;
