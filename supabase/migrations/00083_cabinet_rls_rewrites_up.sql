-- Migration 00083: RLS rewrites pour utiliser has_cabinet_permission — UP
--
-- Réécrit les RLS sur organizations / cabinet_clients / platform_roles pour
-- consulter has_cabinet_permission() au lieu de la simple appartenance au
-- cabinet. Ajoute également un trigger qui empêche un cabinet de se
-- "bricker" en retirant le dernier détenteur actif de can_manage_roles.
--
-- Note: les RLS sur missions / mission_members / control_assessments /
-- assessment_validations ne sont PAS modifiées ici. Elles continuent de
-- s'appuyer sur mission_members.role + cabinet membership. Les permissions
-- can_create_mission / can_delete_mission / can_be_lead / can_designate_lead
-- sont gardées dans les edge functions correspondantes (cf. 00084 et fns).

-- ============================================================
-- 1. organizations.UPDATE — gardé par can_edit_organization
-- ============================================================

DROP POLICY IF EXISTS "organizations_update_members" ON public.organizations;

CREATE POLICY "organizations_update_can_edit"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_edit_organization')
  )
  WITH CHECK (
    id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_edit_organization')
  );

-- ============================================================
-- 2. cabinet_clients.INSERT/UPDATE/DELETE — gardé par can_manage_clients
-- ============================================================

DROP POLICY IF EXISTS "cabinet_clients_insert_cabinet" ON public.cabinet_clients;
DROP POLICY IF EXISTS "cabinet_clients_update_cabinet" ON public.cabinet_clients;
DROP POLICY IF EXISTS "cabinet_clients_delete_cabinet" ON public.cabinet_clients;

CREATE POLICY "cabinet_clients_insert_can_manage"
  ON public.cabinet_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    cabinet_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_clients')
  );

CREATE POLICY "cabinet_clients_update_can_manage"
  ON public.cabinet_clients FOR UPDATE
  TO authenticated
  USING (
    cabinet_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_clients')
  )
  WITH CHECK (
    cabinet_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_clients')
  );

CREATE POLICY "cabinet_clients_delete_can_manage"
  ON public.cabinet_clients FOR DELETE
  TO authenticated
  USING (
    cabinet_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_clients')
  );

-- ============================================================
-- 3. platform_roles.INSERT/UPDATE/DELETE — gardé par can_manage_roles
-- ============================================================

DROP POLICY IF EXISTS "platform_roles_insert_org_members" ON public.platform_roles;
DROP POLICY IF EXISTS "platform_roles_update_org_members" ON public.platform_roles;
DROP POLICY IF EXISTS "platform_roles_delete_org_members" ON public.platform_roles;

CREATE POLICY "platform_roles_insert_can_manage_roles"
  ON public.platform_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_roles')
  );

CREATE POLICY "platform_roles_update_can_manage_roles"
  ON public.platform_roles FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_roles')
  )
  WITH CHECK (
    organization_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_roles')
  );

CREATE POLICY "platform_roles_delete_can_manage_roles"
  ON public.platform_roles FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
    AND public.has_cabinet_permission('can_manage_roles')
  );

-- ============================================================
-- 4. Trigger anti-bricking — empêcher la dernière démotion can_manage_roles
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_last_admin_role_demotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_owner boolean;
BEGIN
  -- Bypass si l'opération est faite par le service_role (auth.uid() est NULL)
  -- ou par un platform_owner (qui peut tout faire pour réparer un cabinet bloqué)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_platform_owner INTO v_caller_owner
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF COALESCE(v_caller_owner, false) THEN
    RETURN NEW;
  END IF;

  -- Cas 1: UPDATE qui retire can_manage_roles d'un rôle qui l'avait
  IF TG_OP = 'UPDATE'
     AND COALESCE((OLD.permissions ->> 'can_manage_roles')::boolean, false) = true
     AND COALESCE((NEW.permissions ->> 'can_manage_roles')::boolean, false) = false
  THEN
    -- Vérifie qu'il reste au moins un autre rôle dans le cabinet qui accorde
    -- can_manage_roles à au moins un user actif
    IF NOT EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      JOIN public.user_platform_roles upr ON upr.platform_role_id = pr.id
      JOIN public.users u ON u.id = upr.user_id
      WHERE pr.organization_id = NEW.organization_id
        AND pr.id <> NEW.id
        AND COALESCE((pr.permissions ->> 'can_manage_roles')::boolean, false) = true
        AND u.is_active = true
    ) THEN
      RAISE EXCEPTION 'Impossible: ce rôle est le dernier détenteur de can_manage_roles dans le cabinet. Promouvez un autre rôle d''abord.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Cas 2: DELETE d'un rôle qui détenait can_manage_roles
  IF TG_OP = 'DELETE'
     AND COALESCE((OLD.permissions ->> 'can_manage_roles')::boolean, false) = true
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      JOIN public.user_platform_roles upr ON upr.platform_role_id = pr.id
      JOIN public.users u ON u.id = upr.user_id
      WHERE pr.organization_id = OLD.organization_id
        AND pr.id <> OLD.id
        AND COALESCE((pr.permissions ->> 'can_manage_roles')::boolean, false) = true
        AND u.is_active = true
    ) THEN
      RAISE EXCEPTION 'Impossible: ce rôle est le dernier détenteur de can_manage_roles dans le cabinet. Promouvez un autre rôle d''abord.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.prevent_last_admin_role_demotion() IS
  'Empêche un cabinet de perdre son dernier rôle administratif (can_manage_roles). Bypass pour service_role et platform_owner.';

DROP TRIGGER IF EXISTS trg_prevent_last_admin_demotion ON public.platform_roles;
CREATE TRIGGER trg_prevent_last_admin_demotion
  BEFORE UPDATE OR DELETE ON public.platform_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_role_demotion();
