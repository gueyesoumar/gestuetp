-- Seed: Mission de démo PSSI-ES complète (toutes phases terminées)
-- Prérequis: le framework PSSI-ES (00000000-0000-0000-0000-000000000017) doit exister
-- Ce script utilise des subqueries pour trouver les IDs dynamiquement
-- À exécuter en tant que service_role (SQL Editor Supabase)

DO $$
DECLARE
  v_cabinet_id uuid;
  v_client_id uuid;
  v_framework_id uuid := '00000000-0000-0000-0000-000000000017';
  v_mission_id uuid := gen_random_uuid();
  v_lead_id uuid;
  v_control record;
  v_assessment_id uuid;
  v_status text;
  v_classification text;
  v_findings text;
  v_recommendations text;
  v_counter int := 0;
BEGIN

  -- 1. Trouver le premier cabinet (organisation de type "cabinet")
  SELECT id INTO v_cabinet_id
  FROM public.organizations
  WHERE types @> ARRAY['cabinet']
  AND is_active = true
  LIMIT 1;

  IF v_cabinet_id IS NULL THEN
    RAISE EXCEPTION 'Aucun cabinet trouvé';
  END IF;

  -- 2. Trouver la première entité supervisée (ou le premier client)
  SELECT id INTO v_client_id
  FROM public.organizations
  WHERE parent_org_id = v_cabinet_id
  AND is_active = true
  LIMIT 1;

  -- Fallback: premier client du cabinet
  IF v_client_id IS NULL THEN
    SELECT client_org_id INTO v_client_id
    FROM public.cabinet_clients
    WHERE cabinet_id = v_cabinet_id
    AND client_org_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Aucun client trouvé pour le cabinet';
  END IF;

  -- 3. Trouver un utilisateur du cabinet pour être lead auditor
  SELECT id INTO v_lead_id
  FROM public.users
  WHERE organization_id = v_cabinet_id
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé dans le cabinet';
  END IF;

  -- 4. Créer la mission (statut: closure = toutes phases terminées)
  INSERT INTO public.missions (id, cabinet_id, client_id, framework_id, name, description, status, lead_auditor_id, start_date, end_date)
  VALUES (
    v_mission_id,
    v_cabinet_id,
    v_client_id,
    v_framework_id,
    'Audit PSSI-ES — Démo complète',
    'Mission de démonstration avec toutes les phases terminées et des résultats variés pour illustrer les fonctionnalités de la plateforme.',
    'closure',
    v_lead_id,
    '2025-09-01',
    '2025-12-15'
  );

  -- 5. Ajouter le lead comme membre de la mission
  INSERT INTO public.mission_members (mission_id, user_id, role)
  VALUES (v_mission_id, v_lead_id, 'lead_auditor');

  -- 6. Créer les évaluations pour TOUS les contrôles PSSI-ES
  FOR v_control IN
    SELECT c.id as control_id, c.code, c.name, c.sort_order, d.code as domain_code
    FROM public.controls c
    JOIN public.domains d ON d.id = c.domain_id
    WHERE d.framework_id = v_framework_id
    ORDER BY d.sort_order, c.sort_order
  LOOP
    v_counter := v_counter + 1;
    v_assessment_id := gen_random_uuid();

    -- Distribuer les statuts et classifications de manière réaliste
    -- ~60% conformes, ~15% observations, ~15% NC mineures, ~10% NC majeures
    IF v_counter % 10 = 0 THEN
      -- NC majeure (10%)
      v_status := 'approved';
      v_classification := 'major_nc';
      v_findings := 'Non-conformité majeure identifiée. L''exigence ' || v_control.code || ' n''est pas mise en œuvre. Aucune mesure compensatoire n''a été constatée.';
      v_recommendations := 'Action corrective immédiate requise. Mettre en place les mesures décrites dans la règle ' || v_control.code || ' dans un délai de 3 mois.';
    ELSIF v_counter % 7 = 0 THEN
      -- NC mineure (15%)
      v_status := 'approved';
      v_classification := 'minor_nc';
      v_findings := 'Non-conformité mineure sur ' || v_control.code || '. La mesure est partiellement mise en œuvre mais des lacunes subsistent dans l''application.';
      v_recommendations := 'Compléter la mise en œuvre de la règle ' || v_control.code || '. Formaliser la procédure et former le personnel concerné.';
    ELSIF v_counter % 5 = 0 THEN
      -- Observation (15%)
      v_status := 'approved';
      v_classification := 'observation';
      v_findings := 'Observation sur ' || v_control.code || '. La mesure est en place mais des améliorations sont possibles pour renforcer son efficacité.';
      v_recommendations := 'Amélioration recommandée : renforcer la documentation et le suivi de la règle ' || v_control.code || '.';
    ELSIF v_counter % 13 = 0 THEN
      -- Point fort
      v_status := 'approved';
      v_classification := 'strength';
      v_findings := 'Point fort identifié sur ' || v_control.code || '. La mise en œuvre dépasse les exigences minimales avec une approche proactive et bien documentée.';
      v_recommendations := NULL;
    ELSE
      -- Conforme (60%)
      v_status := 'approved';
      v_classification := NULL;
      v_findings := 'Conforme. La règle ' || v_control.code || ' (' || v_control.name || ') est correctement mise en œuvre et documentée.';
      v_recommendations := NULL;
    END IF;

    INSERT INTO public.control_assessments (id, mission_id, control_id, auditor_id, status, findings, recommendations, finding_classification)
    VALUES (
      v_assessment_id,
      v_mission_id,
      v_control.control_id,
      v_lead_id,
      v_status::public.assessment_status,
      v_findings,
      v_recommendations,
      v_classification
    );

    -- Créer les validations (pipeline complet: lead → associate → client)
    INSERT INTO public.assessment_validations (assessment_id, stage, decision, validated_by, comment)
    VALUES
      (v_assessment_id, 'lead_review', 'approved', v_lead_id, NULL),
      (v_assessment_id, 'associate_review', 'approved', v_lead_id, NULL),
      (v_assessment_id, 'client_review', 'approved', v_lead_id, 'Constat accepté par l''entité.');

  END LOOP;

  -- 7. Créer des CARs pour les NC majeures
  INSERT INTO public.corrective_action_requests (mission_id, assessment_id, control_code, control_name, finding_classification, finding_text, recommendation_text, status, created_by)
  SELECT
    v_mission_id,
    ca.id,
    c.code,
    c.name,
    'major_nc',
    ca.findings,
    ca.recommendations,
    CASE
      WHEN c.sort_order % 3 = 0 THEN 'client_responded'
      WHEN c.sort_order % 3 = 1 THEN 'verified'
      ELSE 'open'
    END,
    v_lead_id
  FROM public.control_assessments ca
  JOIN public.controls c ON c.id = ca.control_id
  WHERE ca.mission_id = v_mission_id
    AND ca.finding_classification = 'major_nc';

  -- 8. Mettre à jour les CARs avec des réponses client pour celles en status 'client_responded' ou 'validated'
  UPDATE public.corrective_action_requests
  SET
    client_root_cause = 'Cause identifiée : absence de procédure formalisée et manque de ressources dédiées.',
    client_action = 'Plan d''action : formalisation de la procédure, désignation d''un responsable, formation du personnel. Échéance : 3 mois.',
    client_target_date = '2026-03-31'
  WHERE mission_id = v_mission_id
    AND status IN ('client_responded', 'verified');

  RAISE NOTICE 'Mission de démo créée avec succès. ID: %, % contrôles évalués', v_mission_id, v_counter;

END $$;
