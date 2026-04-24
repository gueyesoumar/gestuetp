-- Seed: Remplir les missions PSSI-ES existantes avec des données de démo
-- Chaque mission a un profil de conformité différent pour plus de réalisme
-- Remplit UNIQUEMENT les missions qui n'ont pas encore d'évaluations
-- À exécuter en tant que service_role (SQL Editor Supabase)

DO $$
DECLARE
  v_framework_id uuid := '00000000-0000-0000-0000-000000000017';
  v_mission record;
  v_control record;
  v_assessment_id uuid;
  v_lead_id uuid;
  v_classification text;
  v_findings text;
  v_recommendations text;
  v_ass_status text;
  v_counter int;
  v_mission_count int := 0;
  v_mission_index int := 0;
  v_existing_count int;
  v_seed int;
  v_rand int;
  -- Profils de maturité par mission (pour varier les scores)
  -- Le seed change par mission pour que chaque entité ait un profil différent
BEGIN

  FOR v_mission IN
    SELECT m.id, m.name, m.lead_auditor_id, m.cabinet_id
    FROM public.missions m
    WHERE m.framework_id = v_framework_id
    ORDER BY m.created_at
  LOOP

    -- Vérifier si la mission a déjà des évaluations
    SELECT count(*) INTO v_existing_count
    FROM public.control_assessments
    WHERE mission_id = v_mission.id;

    IF v_existing_count > 0 THEN
      RAISE NOTICE 'Mission "%" a déjà % évaluations, ignorée.', v_mission.name, v_existing_count;
      CONTINUE;
    END IF;

    v_lead_id := v_mission.lead_auditor_id;
    IF v_lead_id IS NULL THEN
      SELECT id INTO v_lead_id
      FROM public.users
      WHERE organization_id = v_mission.cabinet_id
      LIMIT 1;
    END IF;

    IF v_lead_id IS NULL THEN
      RAISE NOTICE 'Mission "%" : aucun auditeur trouvé, ignorée.', v_mission.name;
      CONTINUE;
    END IF;

    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (v_mission.id, v_lead_id, 'lead_auditor')
    ON CONFLICT DO NOTHING;

    v_counter := 0;
    v_mission_index := v_mission_index + 1;

    -- Chaque mission a un "seed" différent pour varier les distributions
    -- Mission 1: entité mature (score ~75%), Mission 2: moyenne (~55%), Mission 3: faible (~40%)
    v_seed := v_mission_index;

    FOR v_control IN
      SELECT c.id as control_id, c.code, c.name, c.sort_order, d.code as domain_code, d.sort_order as d_sort
      FROM public.controls c
      JOIN public.domains d ON d.id = c.domain_id
      WHERE d.framework_id = v_framework_id
      ORDER BY d.sort_order, c.sort_order
    LOOP
      v_counter := v_counter + 1;
      v_assessment_id := gen_random_uuid();

      -- Générer un pseudo-aléatoire basé sur le seed de la mission + le compteur
      v_rand := (v_counter * 7 + v_seed * 31 + v_control.d_sort * 13) % 100;

      -- Profils de maturité par mission :
      -- Mission 1 (seed=1): entité mature    → 70% conforme, 10% obs, 10% NC min, 5% NC maj, 5% force
      -- Mission 2 (seed=2): entité moyenne   → 45% conforme, 15% obs, 20% NC min, 15% NC maj, 5% force
      -- Mission 3 (seed=3): entité immature  → 25% conforme, 10% obs, 25% NC min, 35% NC maj, 5% force
      -- Mission 4+ : cycle entre les profils

      CASE (v_seed - 1) % 3
        WHEN 0 THEN -- Entité mature
          IF v_rand < 5 THEN
            v_classification := 'strength';
          ELSIF v_rand < 15 THEN
            v_classification := 'major_nc';
          ELSIF v_rand < 25 THEN
            v_classification := 'minor_nc';
          ELSIF v_rand < 35 THEN
            v_classification := 'observation';
          ELSE
            v_classification := NULL; -- Conforme
          END IF;

        WHEN 1 THEN -- Entité moyenne
          IF v_rand < 5 THEN
            v_classification := 'strength';
          ELSIF v_rand < 20 THEN
            v_classification := 'major_nc';
          ELSIF v_rand < 40 THEN
            v_classification := 'minor_nc';
          ELSIF v_rand < 55 THEN
            v_classification := 'observation';
          ELSE
            v_classification := NULL; -- Conforme
          END IF;

        WHEN 2 THEN -- Entité immature
          IF v_rand < 5 THEN
            v_classification := 'strength';
          ELSIF v_rand < 40 THEN
            v_classification := 'major_nc';
          ELSIF v_rand < 65 THEN
            v_classification := 'minor_nc';
          ELSIF v_rand < 75 THEN
            v_classification := 'observation';
          ELSE
            v_classification := NULL; -- Conforme
          END IF;
      END CASE;

      -- Statut : les NC non corrigées restent en "submitted" ou "in_review"
      -- Les conformes et observations sont "approved"
      IF v_classification = 'major_nc' THEN
        -- NC majeures : certaines approuvées, certaines encore en revue
        IF v_rand % 3 = 0 THEN
          v_ass_status := 'approved';
        ELSIF v_rand % 3 = 1 THEN
          v_ass_status := 'in_review';
        ELSE
          v_ass_status := 'submitted';
        END IF;
      ELSIF v_classification = 'minor_nc' THEN
        IF v_rand % 4 = 0 THEN
          v_ass_status := 'in_review';
        ELSE
          v_ass_status := 'approved';
        END IF;
      ELSE
        v_ass_status := 'approved';
      END IF;

      -- Générer les textes de constats
      CASE v_classification
        WHEN 'major_nc' THEN
          v_findings := 'Non-conformité majeure : l''exigence ' || v_control.code || ' (' || v_control.name || ') n''est pas mise en œuvre. '
            || CASE v_rand % 4
              WHEN 0 THEN 'Aucune procédure formalisée n''a été identifiée.'
              WHEN 1 THEN 'Les mesures existantes sont insuffisantes et non documentées.'
              WHEN 2 THEN 'L''absence de cette mesure expose l''entité à un risque élevé.'
              ELSE 'Aucune preuve de mise en œuvre n''a pu être fournie lors de l''audit.'
            END;
          v_recommendations := CASE v_rand % 3
            WHEN 0 THEN 'Mettre en place immédiatement les mesures décrites dans ' || v_control.code || '. Délai recommandé : 3 mois.'
            WHEN 1 THEN 'Élaborer et formaliser une procédure conforme à ' || v_control.code || '. Former le personnel concerné. Délai : 6 mois.'
            ELSE 'Action corrective prioritaire. Désigner un responsable et établir un plan de mise en conformité sous 3 mois.'
          END;

        WHEN 'minor_nc' THEN
          v_findings := 'Non-conformité mineure sur ' || v_control.code || ' (' || v_control.name || '). '
            || CASE v_rand % 3
              WHEN 0 THEN 'La mesure est partiellement mise en œuvre mais la documentation est incomplète.'
              WHEN 1 THEN 'Le processus existe mais n''est pas systématiquement appliqué.'
              ELSE 'Des écarts ponctuels ont été constatés lors de l''audit terrain.'
            END;
          v_recommendations := 'Compléter la mise en œuvre de ' || v_control.code || ' et formaliser les procédures associées.';

        WHEN 'observation' THEN
          v_findings := 'Observation sur ' || v_control.code || '. '
            || CASE v_rand % 3
              WHEN 0 THEN 'La mesure est en place mais gagnerait à être mieux documentée.'
              WHEN 1 THEN 'Mise en œuvre satisfaisante avec des marges d''amélioration identifiées.'
              ELSE 'Le dispositif est opérationnel mais la traçabilité peut être renforcée.'
            END;
          v_recommendations := 'Renforcer la documentation et le suivi de ' || v_control.code || '.';

        WHEN 'strength' THEN
          v_findings := 'Point fort sur ' || v_control.code || ' (' || v_control.name || '). '
            || CASE v_rand % 2
              WHEN 0 THEN 'Mise en œuvre exemplaire dépassant les exigences minimales du référentiel.'
              ELSE 'Approche proactive, bien documentée et régulièrement revue par la direction.'
            END;
          v_recommendations := NULL;

        ELSE -- Conforme
          v_findings := 'Conforme. ' || v_control.code || ' (' || v_control.name || ') : '
            || CASE v_rand % 4
              WHEN 0 THEN 'mesure correctement mise en œuvre et documentée.'
              WHEN 1 THEN 'dispositif opérationnel conforme aux exigences du référentiel.'
              WHEN 2 THEN 'procédure en place, preuves vérifiées lors de l''audit.'
              ELSE 'mise en œuvre conforme avec preuves disponibles.'
            END;
          v_recommendations := NULL;
      END CASE;

      INSERT INTO public.control_assessments (id, mission_id, control_id, auditor_id, status, findings, recommendations, finding_classification)
      VALUES (
        v_assessment_id,
        v_mission.id,
        v_control.control_id,
        v_lead_id,
        v_ass_status::public.assessment_status,
        v_findings,
        v_recommendations,
        v_classification
      );

      -- Validations selon le statut
      IF v_ass_status = 'approved' THEN
        INSERT INTO public.assessment_validations (assessment_id, stage, decision, validated_by, comment)
        VALUES
          (v_assessment_id, 'lead_review', 'approved', v_lead_id, NULL),
          (v_assessment_id, 'associate_review', 'approved', v_lead_id, NULL),
          (v_assessment_id, 'client_review', 'approved', v_lead_id, 'Constat accepté.');
      ELSIF v_ass_status = 'in_review' THEN
        INSERT INTO public.assessment_validations (assessment_id, stage, decision, validated_by, comment)
        VALUES
          (v_assessment_id, 'lead_review', 'approved', v_lead_id, NULL);
      END IF;
      -- 'submitted' = pas encore de validation

    END LOOP;

    -- CARs pour les NC majeures approuvées
    INSERT INTO public.corrective_action_requests (mission_id, assessment_id, code, control_code, control_name, finding_classification, description, status, created_by)
    SELECT
      v_mission.id,
      ca.id,
      'CAR-' || c.code,
      c.code,
      c.name,
      'major_nc',
      ca.findings || E'\n\nRecommandation : ' || COALESCE(ca.recommendations, ''),
      CASE
        WHEN c.sort_order % 3 = 0 THEN 'client_responded'
        WHEN c.sort_order % 3 = 1 THEN 'verified'
        ELSE 'open'
      END,
      v_lead_id
    FROM public.control_assessments ca
    JOIN public.controls c ON c.id = ca.control_id
    WHERE ca.mission_id = v_mission.id
      AND ca.finding_classification = 'major_nc'
      AND ca.status = 'approved'::public.assessment_status;

    -- Réponses client
    UPDATE public.corrective_action_requests
    SET
      client_root_cause = 'Cause identifiée : absence de procédure formalisée et manque de ressources dédiées.',
      client_action = 'Plan d''action : formalisation de la procédure, désignation d''un responsable, formation du personnel.',
      client_target_date = '2026-06-30'
    WHERE mission_id = v_mission.id
      AND status IN ('client_responded', 'verified');

    -- Statut mission selon le profil
    UPDATE public.missions
    SET status = (CASE
      WHEN v_seed % 3 = 1 THEN 'closure'
      WHEN v_seed % 3 = 2 THEN 'client_review'
      ELSE 'internal_review'
    END)::public.mission_status
    WHERE id = v_mission.id;

    v_mission_count := v_mission_count + 1;
    RAISE NOTICE 'Mission "%" remplie (profil %) : % contrôles.', v_mission.name,
      CASE (v_seed - 1) % 3 WHEN 0 THEN 'mature' WHEN 1 THEN 'moyen' ELSE 'immature' END,
      v_counter;

  END LOOP;

  RAISE NOTICE 'Terminé. % missions remplies.', v_mission_count;

END $$;
