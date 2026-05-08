-- Migration 00125: Application des quotas plan-based (UP)
-- Description: Ajoute des fonctions SECURITY DEFINER + triggers BEFORE INSERT/UPDATE
-- pour empêcher un cabinet de dépasser les limites max_users / max_missions définies
-- par son plan (table plans, colonnes ajoutées en 00121).
--
-- Principes :
--   - Comptage : utilisateurs/missions ACTIFS (is_active = true)
--   - Exemption : organisations de type 'platform' (Gëstu lui-même)
--   - NULL sur plans.max_* = illimité (aucun check)
--   - Erreur SQLSTATE P0001 avec message lisible en français
--
-- ATTENTION : si un cabinet est actuellement au-dessus de son quota, toute future
-- insertion sera bloquée jusqu'à ce qu'il revienne sous le quota. Un RAISE NOTICE
-- en fin de migration liste les cabinets en surcapacité.

-- ════════════════════════════════════════════════════════════════════════════
-- Fonctions SECURITY DEFINER
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_user_quota(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_max int;
  v_current int;
  v_types text[];
BEGIN
  IF p_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'no_org');
  END IF;

  SELECT types INTO v_types FROM public.organizations WHERE id = p_org_id;
  IF v_types IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'org_not_found');
  END IF;
  IF 'platform' = ANY(v_types) THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'platform_org_exempt');
  END IF;

  SELECT pl.max_users INTO v_max
  FROM public.organizations o
  LEFT JOIN public.plans pl ON pl.id = o.plan_id
  WHERE o.id = p_org_id;

  IF v_max IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'unlimited');
  END IF;

  SELECT COUNT(*) INTO v_current
  FROM public.users
  WHERE organization_id = p_org_id AND is_active = true;

  IF v_current >= v_max THEN
    RETURN jsonb_build_object('ok', false, 'current', v_current, 'max', v_max, 'error', 'user_quota_exceeded');
  END IF;

  RETURN jsonb_build_object('ok', true, 'current', v_current, 'max', v_max);
END;
$$;

COMMENT ON FUNCTION public.check_user_quota(uuid) IS
  'Vérifie si une organisation peut accueillir un utilisateur actif supplémentaire selon son plan.';


CREATE OR REPLACE FUNCTION public.check_mission_quota(p_cabinet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_max int;
  v_current int;
  v_types text[];
BEGIN
  IF p_cabinet_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'no_cabinet');
  END IF;

  SELECT types INTO v_types FROM public.organizations WHERE id = p_cabinet_id;
  IF v_types IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'org_not_found');
  END IF;
  IF 'platform' = ANY(v_types) THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'platform_org_exempt');
  END IF;

  SELECT pl.max_missions INTO v_max
  FROM public.organizations o
  LEFT JOIN public.plans pl ON pl.id = o.plan_id
  WHERE o.id = p_cabinet_id;

  IF v_max IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'unlimited');
  END IF;

  SELECT COUNT(*) INTO v_current
  FROM public.missions
  WHERE cabinet_id = p_cabinet_id AND is_active = true;

  IF v_current >= v_max THEN
    RETURN jsonb_build_object('ok', false, 'current', v_current, 'max', v_max, 'error', 'mission_quota_exceeded');
  END IF;

  RETURN jsonb_build_object('ok', true, 'current', v_current, 'max', v_max);
END;
$$;

COMMENT ON FUNCTION public.check_mission_quota(uuid) IS
  'Vérifie si un cabinet peut accueillir une mission active supplémentaire selon son plan.';


-- ════════════════════════════════════════════════════════════════════════════
-- Trigger functions
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_user_quota_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_check jsonb;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- UPDATE : ne re-checker que si org change OU si is_active passe de false → true
  IF TG_OP = 'UPDATE'
     AND OLD.organization_id = NEW.organization_id
     AND OLD.is_active IS TRUE THEN
    RETURN NEW;
  END IF;

  v_check := public.check_user_quota(NEW.organization_id);
  IF (v_check->>'ok')::boolean = false THEN
    RAISE EXCEPTION 'Quota utilisateurs dépassé pour ce cabinet (% / %). Désactivez un membre ou faites évoluer le plan.',
      v_check->>'current', v_check->>'max'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.enforce_mission_quota_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_check jsonb;
BEGIN
  IF NEW.cabinet_id IS NULL OR NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.cabinet_id = NEW.cabinet_id
     AND OLD.is_active IS TRUE THEN
    RETURN NEW;
  END IF;

  v_check := public.check_mission_quota(NEW.cabinet_id);
  IF (v_check->>'ok')::boolean = false THEN
    RAISE EXCEPTION 'Quota missions actives dépassé pour ce cabinet (% / %). Clôturez une mission ou faites évoluer le plan.',
      v_check->>'current', v_check->>'max'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- Triggers
-- ════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_users_quota ON public.users;
CREATE TRIGGER trg_users_quota
  BEFORE INSERT OR UPDATE OF organization_id, is_active ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_quota_trigger();

DROP TRIGGER IF EXISTS trg_missions_quota ON public.missions;
CREATE TRIGGER trg_missions_quota
  BEFORE INSERT OR UPDATE OF cabinet_id, is_active ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_quota_trigger();


-- ════════════════════════════════════════════════════════════════════════════
-- Diagnostic : signaler les cabinets en surcapacité
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
BEGIN
  -- Users
  FOR r IN
    SELECT o.id, o.name, pl.max_users, COUNT(u.id) FILTER (WHERE u.is_active) AS current
    FROM public.organizations o
    LEFT JOIN public.plans pl ON pl.id = o.plan_id
    LEFT JOIN public.users u ON u.organization_id = o.id
    WHERE pl.max_users IS NOT NULL AND NOT ('platform' = ANY(o.types))
    GROUP BY o.id, o.name, pl.max_users
    HAVING COUNT(u.id) FILTER (WHERE u.is_active) > pl.max_users
  LOOP
    RAISE NOTICE '⚠️  Cabinet "%" en surcapacité utilisateurs : % / %', r.name, r.current, r.max_users;
  END LOOP;

  -- Missions
  FOR r IN
    SELECT o.id, o.name, pl.max_missions, COUNT(m.id) FILTER (WHERE m.is_active) AS current
    FROM public.organizations o
    LEFT JOIN public.plans pl ON pl.id = o.plan_id
    LEFT JOIN public.missions m ON m.cabinet_id = o.id
    WHERE pl.max_missions IS NOT NULL AND NOT ('platform' = ANY(o.types))
    GROUP BY o.id, o.name, pl.max_missions
    HAVING COUNT(m.id) FILTER (WHERE m.is_active) > pl.max_missions
  LOOP
    RAISE NOTICE '⚠️  Cabinet "%" en surcapacité missions : % / %', r.name, r.current, r.max_missions;
  END LOOP;
END $$;
