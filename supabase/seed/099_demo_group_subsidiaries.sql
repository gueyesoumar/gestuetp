-- Seed démo : 5 filiales rattachées à Gëstu Advisory + missions + assessments
-- =============================================================================
--
-- Met en évidence la supervision groupe : Gëstu Advisory (cabinet+group)
-- supervise 5 filiales fictives, chacune avec missions ISO 27001 ± PSSI-ES
-- et assessments variés. Profils de maturité contrastés (1 rouge, 2 orange,
-- 2 vert) pour rendre la heatmap et le classement lisibles.
--
-- IDEMPOTENT : tous les inserts utilisent ON CONFLICT DO NOTHING. Les UUIDs
-- sont préfixés '00000000-0000-0000-0099-' pour cleanup trivial.
-- TOLÉRANT À L'ABSENCE : si Gëstu Advisory n'existe pas, chaque section est
-- un no-op (les JOIN renvoient 0 row). Aucun risque d'orphelin.
--
-- Cleanup : exécuter `supabase/seed/099_demo_group_subsidiaries_cleanup.sql`.
--
-- À exécuter EN TANT QUE postgres (bypass RLS et trigger 00095 grâce à
-- auth.uid() NULL en superuser).

-- =============================================================================
-- 0. Pré-vérification (informatif, non bloquant)
-- =============================================================================

DO $$
DECLARE
  v_cabinet_id uuid;
  v_lead_id uuid;
BEGIN
  SELECT id INTO v_cabinet_id FROM public.organizations
  WHERE name = 'Gëstu Advisory'
    AND 'cabinet' = ANY(types) AND 'group' = ANY(types) LIMIT 1;

  IF v_cabinet_id IS NULL THEN
    RAISE NOTICE '[seed démo] Aucune org "Gëstu Advisory" cabinet+group trouvée — sections suivantes seront no-op.';
    RETURN;
  END IF;

  SELECT id INTO v_lead_id FROM public.users
  WHERE organization_id = v_cabinet_id AND is_active = true
  ORDER BY created_at ASC LIMIT 1;

  RAISE NOTICE '[seed démo] Cabinet groupe: %, lead-auditor: %', v_cabinet_id,
    COALESCE(v_lead_id::text, 'AUCUN — assessments ne seront pas générés');
END $$;

-- =============================================================================
-- 1. Filiales (5 organisations rattachées à Gëstu Advisory)
-- =============================================================================
-- Le JOIN sur Advisory garantit qu'aucune filiale n'est créée sans parent.

INSERT INTO public.organizations (id, name, slug, types, parent_org_id, country, sector, is_active, description)
SELECT v.id, v.name, v.slug, ARRAY['client'], advisory.id, 'Sénégal', v.sector, true, '[DÉMO] ' || v.description
FROM (VALUES
  ('00000000-0000-0000-0099-000000000001'::uuid, 'Démo Banque SA',         'demo-banque-sa',   'Banque & Finance', 'Filiale fictive secteur bancaire pour démo de supervision groupe'),
  ('00000000-0000-0000-0099-000000000002'::uuid, 'Démo Santé+',            'demo-sante-plus',  'Santé',            'Filiale fictive secteur santé pour démo de supervision groupe'),
  ('00000000-0000-0000-0099-000000000003'::uuid, 'Démo Télécom Network',   'demo-telco',       'Télécom',          'Filiale fictive secteur télécom pour démo de supervision groupe'),
  ('00000000-0000-0000-0099-000000000004'::uuid, 'Démo Service Public',    'demo-public',      'Public',           'Filiale fictive secteur public pour démo de supervision groupe'),
  ('00000000-0000-0000-0099-000000000005'::uuid, 'Démo Énergie & Co',      'demo-energie',     'Énergie',          'Filiale fictive secteur énergie pour démo de supervision groupe')
) AS v(id, name, slug, sector, description)
JOIN public.organizations advisory
  ON advisory.name = 'Gëstu Advisory'
 AND 'cabinet' = ANY(advisory.types)
 AND 'group' = ANY(advisory.types)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. Comptes RSSI (1 par filiale, mot de passe verrouillé)
-- =============================================================================
-- auth.users + auth.identities : indépendants, créés systématiquement.
-- public.users : JOIN sur la filiale → no-op si la section 1 n'a rien créé.

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token
)
SELECT v.id, '00000000-0000-0000-0000-000000000000'::uuid, v.email,
       -- Mot de passe inutilisable (hash random). Reset password requis pour activer.
       crypt(gen_random_uuid()::text, gen_salt('bf')),
       now(),
       '{"provider": "email", "providers": ["email"]}'::jsonb,
       jsonb_build_object('first_name', v.first_name, 'last_name', v.last_name),
       'authenticated', 'authenticated', now(), now(), ''
FROM (VALUES
  ('00000000-0000-0000-0099-100000000001'::uuid, 'rssi+demo-banque@gestugroup.com',  'Aïssatou', 'Diop'),
  ('00000000-0000-0000-0099-100000000002'::uuid, 'rssi+demo-sante@gestugroup.com',   'Mamadou',  'Sow'),
  ('00000000-0000-0000-0099-100000000003'::uuid, 'rssi+demo-telco@gestugroup.com',   'Fatou',    'Ndiaye'),
  ('00000000-0000-0000-0099-100000000004'::uuid, 'rssi+demo-public@gestugroup.com',  'Ibrahima', 'Ba'),
  ('00000000-0000-0000-0099-100000000005'::uuid, 'rssi+demo-energie@gestugroup.com', 'Awa',      'Sarr')
) AS v(id, email, first_name, last_name)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT v.id, v.id,
       jsonb_build_object('sub', v.id::text, 'email', v.email, 'email_verified', true),
       'email', v.email, NULL, now(), now()
FROM (VALUES
  ('00000000-0000-0000-0099-100000000001'::uuid, 'rssi+demo-banque@gestugroup.com'),
  ('00000000-0000-0000-0099-100000000002'::uuid, 'rssi+demo-sante@gestugroup.com'),
  ('00000000-0000-0000-0099-100000000003'::uuid, 'rssi+demo-telco@gestugroup.com'),
  ('00000000-0000-0000-0099-100000000004'::uuid, 'rssi+demo-public@gestugroup.com'),
  ('00000000-0000-0000-0099-100000000005'::uuid, 'rssi+demo-energie@gestugroup.com')
) AS v(id, email)
ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO public.users (id, auth_id, organization_id, email, first_name, last_name, job_title, is_active)
SELECT v.id, v.id, fil.id, v.email, v.first_name, v.last_name, 'RSSI (démo)', true
FROM (VALUES
  ('00000000-0000-0000-0099-100000000001'::uuid, '00000000-0000-0000-0099-000000000001'::uuid, 'rssi+demo-banque@gestugroup.com',  'Aïssatou', 'Diop'),
  ('00000000-0000-0000-0099-100000000002'::uuid, '00000000-0000-0000-0099-000000000002'::uuid, 'rssi+demo-sante@gestugroup.com',   'Mamadou',  'Sow'),
  ('00000000-0000-0000-0099-100000000003'::uuid, '00000000-0000-0000-0099-000000000003'::uuid, 'rssi+demo-telco@gestugroup.com',   'Fatou',    'Ndiaye'),
  ('00000000-0000-0000-0099-100000000004'::uuid, '00000000-0000-0000-0099-000000000004'::uuid, 'rssi+demo-public@gestugroup.com',  'Ibrahima', 'Ba'),
  ('00000000-0000-0000-0099-100000000005'::uuid, '00000000-0000-0000-0099-000000000005'::uuid, 'rssi+demo-energie@gestugroup.com', 'Awa',      'Sarr')
) AS v(id, fil_id, email, first_name, last_name)
JOIN public.organizations fil ON fil.id = v.fil_id
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. Campagne d'audit ISO 27001 en cours (rattachée à Gëstu Advisory)
-- =============================================================================

INSERT INTO public.audit_campaigns (id, organization_id, framework_id, name, period_label, period_start, period_end, status)
SELECT '00000000-0000-0000-0099-300000000001'::uuid,
       advisory.id,
       '00000000-0000-0000-0000-000000000010'::uuid,
       'Campagne ISO 27001 — Cycle 2025',
       'Année 2025', '2025-01-15', '2025-12-31', 'active'
FROM public.organizations advisory
WHERE advisory.name = 'Gëstu Advisory'
  AND 'group' = ANY(advisory.types)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. 8 missions (cabinet = Gëstu Advisory, client = filiale)
-- =============================================================================
-- Mix ISO 27001 (id ...010) + PSSI-ES (id ...017), statuts variés
-- early-return si Gëstu Advisory absent → no-op propre

DO $$
DECLARE
  v_cabinet_id uuid;
  v_lead_id uuid;
  v_iso_fw uuid := '00000000-0000-0000-0000-000000000010';
  v_pssi_fw uuid := '00000000-0000-0000-0000-000000000017';
  v_camp_id uuid := '00000000-0000-0000-0099-300000000001';
BEGIN
  SELECT id INTO v_cabinet_id FROM public.organizations
  WHERE name = 'Gëstu Advisory'
    AND 'cabinet' = ANY(types) AND 'group' = ANY(types) LIMIT 1;

  IF v_cabinet_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_lead_id FROM public.users
  WHERE organization_id = v_cabinet_id AND is_active = true
  ORDER BY created_at ASC LIMIT 1;

  INSERT INTO public.missions (id, cabinet_id, client_id, framework_id, name, description, status, lead_auditor_id, start_date, end_date, campaign_id, is_active)
  SELECT v.id, v_cabinet_id, v.client_id, v.fw, v.name, v.description, v.st::public.mission_status, v_lead_id, v.sd, v.ed, v.camp, true
  FROM (VALUES
  -- BANQUE SA (mature) : 1 ISO en internal_review + 1 PSSI-ES en fieldwork
    ('00000000-0000-0000-0099-200000000001'::uuid, '00000000-0000-0000-0099-000000000001'::uuid, v_iso_fw,  'Audit ISO 27001 — Démo Banque SA',         'Audit annuel SMSI',       'internal_review', '2025-02-01'::date, '2025-04-30'::date, v_camp_id),
    ('00000000-0000-0000-0099-200000000002'::uuid, '00000000-0000-0000-0099-000000000001'::uuid, v_pssi_fw, 'Audit PSSI-ES — Démo Banque SA',           'Conformité PSSI-ES',      'fieldwork',       '2025-03-15'::date, '2025-06-30'::date, NULL::uuid),
  -- SANTE+ (moyen) : 1 ISO en fieldwork
    ('00000000-0000-0000-0099-200000000003'::uuid, '00000000-0000-0000-0099-000000000002'::uuid, v_iso_fw,  'Audit ISO 27001 — Démo Santé+',            'Audit initial SMSI',      'fieldwork',       '2025-03-01'::date, '2025-05-31'::date, v_camp_id),
  -- TELCO (faible) : 1 ISO en initialization
    ('00000000-0000-0000-0099-200000000004'::uuid, '00000000-0000-0000-0099-000000000003'::uuid, v_iso_fw,  'Audit ISO 27001 — Démo Télécom Network',   'Mission de cadrage',      'initialization',  '2025-04-01'::date, '2025-07-31'::date, v_camp_id),
  -- PUBLIC (moyen) : 1 ISO closure (clôturée) + 1 PSSI-ES en client_review
    ('00000000-0000-0000-0099-200000000005'::uuid, '00000000-0000-0000-0099-000000000004'::uuid, v_iso_fw,  'Audit ISO 27001 — Démo Service Public',    'Audit de surveillance',   'closure',         '2024-09-01'::date, '2024-12-15'::date, NULL::uuid),
    ('00000000-0000-0000-0099-200000000006'::uuid, '00000000-0000-0000-0099-000000000004'::uuid, v_pssi_fw, 'Audit PSSI-ES — Démo Service Public',      'Conformité PSSI-ES',      'client_review',   '2025-01-15'::date, '2025-04-15'::date, NULL::uuid),
  -- ENERGIE (mature) : 1 ISO en fieldwork + 1 PSSI-ES en internal_review
    ('00000000-0000-0000-0099-200000000007'::uuid, '00000000-0000-0000-0099-000000000005'::uuid, v_iso_fw,  'Audit ISO 27001 — Démo Énergie & Co',      'Audit de renouvellement', 'fieldwork',       '2025-02-15'::date, '2025-05-15'::date, v_camp_id),
    ('00000000-0000-0000-0099-200000000008'::uuid, '00000000-0000-0000-0099-000000000005'::uuid, v_pssi_fw, 'Audit PSSI-ES — Démo Énergie & Co',        'Conformité PSSI-ES',      'internal_review', '2025-01-05'::date, '2025-04-05'::date, NULL::uuid)
  ) AS v(id, client_id, fw, name, description, st, sd, ed, camp)
  -- JOIN sur la filiale pour garantir qu'on n'insère pas une mission sans client valide
  JOIN public.organizations fil ON fil.id = v.client_id
  ON CONFLICT (id) DO NOTHING;

  -- mission_members : lead_auditor sur chaque mission démo
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    SELECT m.id, v_lead_id, 'lead_auditor'::public.mission_role
    FROM public.missions m
    WHERE m.id::text LIKE '00000000-0000-0000-0099-200%'
    ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END $$;

-- =============================================================================
-- 5. Control_assessments générés selon profils de maturité ET statut mission
-- =============================================================================
-- Profil de conformité (déterministe, position pseudo-aléa par contrôle) :
--   mature : 70% c, 15% lc, 10% pc, 3% nc, 2% na   → score ~80
--   moyen  : 40% c, 20% lc, 25% pc, 10% nc, 5% na  → score ~55
--   faible : 15% c, 15% lc, 30% pc, 35% nc, 5% na  → score ~30 (rouge)
--
-- Couverture (réaliste selon statut mission) :
--   initialization : 5 contrôles (mission tout juste démarrée)
--   fieldwork      : 50% des contrôles (en cours)
--   internal_review: 85% des contrôles (auditeur finalise)
--   client_review  : 100% (auditeur a fini, attend validation client)
--   closure        : 100% (mission close)
--
-- La sélection des contrôles partiels utilise md5(control_id || mission_id)
-- pour distribuer sur tous les domaines du framework (pas concentrés sur A.5).

DO $$
DECLARE
  v_cabinet_id uuid;
  v_lead_id uuid;
  v_mission record;
  v_control record;
  v_idx int;
  v_total_controls int;
  v_max_assessments int;
  v_pos int;
  v_conformity text;
  v_classif text;
  v_status public.assessment_status;
BEGIN
  SELECT id INTO v_cabinet_id FROM public.organizations
  WHERE name = 'Gëstu Advisory' AND 'cabinet' = ANY(types) AND 'group' = ANY(types) LIMIT 1;
  IF v_cabinet_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_lead_id FROM public.users
  WHERE organization_id = v_cabinet_id AND is_active = true
  ORDER BY created_at ASC LIMIT 1;

  IF v_lead_id IS NULL THEN
    RAISE NOTICE '[seed démo] Aucun user actif sur Gëstu Advisory : assessments non générés.';
    RETURN;
  END IF;

  FOR v_mission IN
    SELECT m.id, m.framework_id, m.status, m.client_id,
           CASE
             WHEN m.client_id IN ('00000000-0000-0000-0099-000000000001'::uuid,
                                  '00000000-0000-0000-0099-000000000005'::uuid) THEN 'mature'
             WHEN m.client_id = '00000000-0000-0000-0099-000000000003'::uuid THEN 'faible'
             ELSE 'moyen'
           END AS profile
    FROM public.missions m
    WHERE m.id::text LIKE '00000000-0000-0000-0099-200%'
  LOOP
    -- Total de contrôles dans le framework de cette mission
    SELECT count(*) INTO v_total_controls
    FROM public.controls c
    JOIN public.domains d ON d.id = c.domain_id
    WHERE d.framework_id = v_mission.framework_id;

    -- Couverture cible selon statut mission
    v_max_assessments := CASE v_mission.status
      WHEN 'initialization'  THEN LEAST(5, v_total_controls)
      WHEN 'fieldwork'       THEN ceil(v_total_controls * 0.50)::int
      WHEN 'internal_review' THEN ceil(v_total_controls * 0.85)::int
      WHEN 'client_review'   THEN v_total_controls
      WHEN 'closure'         THEN v_total_controls
      ELSE 0
    END;

    -- Statut des assessments
    v_status := CASE v_mission.status
      WHEN 'closure'         THEN 'approved'::public.assessment_status
      WHEN 'client_review'   THEN 'approved'::public.assessment_status
      WHEN 'internal_review' THEN 'submitted'::public.assessment_status
      ELSE                        'draft'::public.assessment_status
    END;

    v_idx := 0;
    -- Pour les missions partielles : distribution sur tous les domaines via md5
    -- Pour les missions à 100% : ordre naturel par domaine + sort_order
    FOR v_control IN
      SELECT c.id
      FROM public.controls c
      JOIN public.domains d ON d.id = c.domain_id
      WHERE d.framework_id = v_mission.framework_id
      ORDER BY
        CASE WHEN v_max_assessments < v_total_controls
          THEN md5(c.id::text || v_mission.id::text)
          ELSE NULL
        END NULLS LAST,
        d.sort_order, c.sort_order
      LIMIT v_max_assessments
    LOOP
      v_idx := v_idx + 1;
      -- Pseudo-aléa déterministe : (idx * 17 + hash mission) mod 100
      v_pos := (v_idx * 17 + (hashtext(v_mission.id::text) % 100 + 100) % 100) % 100;

      IF v_mission.profile = 'mature' THEN
        v_conformity := CASE
          WHEN v_pos < 70 THEN 'c'
          WHEN v_pos < 85 THEN 'lc'
          WHEN v_pos < 95 THEN 'pc'
          WHEN v_pos < 98 THEN 'nc'
          ELSE 'na'
        END;
      ELSIF v_mission.profile = 'faible' THEN
        v_conformity := CASE
          WHEN v_pos < 15 THEN 'c'
          WHEN v_pos < 30 THEN 'lc'
          WHEN v_pos < 60 THEN 'pc'
          WHEN v_pos < 95 THEN 'nc'
          ELSE 'na'
        END;
      ELSE -- moyen
        v_conformity := CASE
          WHEN v_pos < 40 THEN 'c'
          WHEN v_pos < 60 THEN 'lc'
          WHEN v_pos < 85 THEN 'pc'
          WHEN v_pos < 95 THEN 'nc'
          ELSE 'na'
        END;
      END IF;

      v_classif := CASE v_conformity
        WHEN 'c'  THEN NULL
        WHEN 'lc' THEN 'observation'
        WHEN 'pc' THEN 'minor_nc'
        WHEN 'nc' THEN CASE WHEN v_pos % 3 = 0 THEN 'major_nc' ELSE 'minor_nc' END
        ELSE NULL
      END;

      INSERT INTO public.control_assessments (
        mission_id, control_id, auditor_id, status, conformity_level, finding_classification,
        findings, recommendations
      )
      VALUES (
        v_mission.id, v_control.id, v_lead_id, v_status, v_conformity, v_classif,
        CASE WHEN v_conformity IN ('nc','pc','lc')
             THEN '[DÉMO] Constat généré automatiquement pour la démonstration de la supervision groupe.'
             ELSE NULL END,
        CASE WHEN v_conformity IN ('nc','pc')
             THEN '[DÉMO] Recommandation générée automatiquement pour la démonstration.'
             ELSE NULL END
      )
      ON CONFLICT (mission_id, control_id) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE '[seed démo] OK : 5 filiales, 5 RSSI, 1 campagne, 8 missions, assessments selon couverture par statut.';
END $$;
