-- Migration 00082: Système de permissions cabinet — UP
--
-- Introduit deux fonctions SECURITY DEFINER pour interroger les permissions
-- agrégées d'un utilisateur sur son cabinet, en OR-aggregant ses platform_roles.
--
--   has_cabinet_permission(p_perm)               → utilise auth.uid() (RLS policies)
--   user_has_cabinet_permission(p_user_id, p_perm) → caller fournit user_id (edge fns)
--
-- Étend également la liste des flags de permissions cabinet :
--   - can_create_mission     (existant)
--   - can_assign_team        (existant)
--   - can_be_lead            (existant)
--   - can_designate_lead     (existant)
--   - can_delete_mission     (NOUVEAU)
--   - can_manage_members     (NOUVEAU) — invite, suspend, reactivate, remove
--   - can_manage_clients     (NOUVEAU) — CRUD cabinet_clients
--   - can_edit_organization  (NOUVEAU) — UPDATE organizations + libellés revue
--   - can_manage_roles       (NOUVEAU) — CRUD platform_roles + assign-role
--
-- Stratégie de migration des cabinets existants (Stratégie B) :
--   Tous les rôles existants ayant can_create_mission=true reçoivent les
--   5 nouveaux flags à true. Les autres reçoivent false. Les admins peuvent
--   ensuite affiner depuis /membres > Gérer les rôles.
--
-- Override: les utilisateurs avec is_platform_owner=true ont toutes les
-- permissions sur tous les cabinets (back-door super-admin Gëstu).

-- ============================================================
-- 1. Fonction RLS — utilise auth.uid()
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_cabinet_permission(p_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, is_platform_owner
    FROM public.users
    WHERE auth_id = auth.uid()
      AND is_active = true
    LIMIT 1
  )
  SELECT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM me) THEN false
      WHEN (SELECT is_platform_owner FROM me) THEN true
      ELSE COALESCE(
        (
          SELECT bool_or((pr.permissions ->> p_perm)::boolean)
          FROM public.user_platform_roles upr
          JOIN public.platform_roles pr ON pr.id = upr.platform_role_id
          WHERE upr.user_id = (SELECT id FROM me)
        ),
        false
      )
    END;
$$;

COMMENT ON FUNCTION public.has_cabinet_permission(text) IS
  'Vérifie si l''utilisateur courant (auth.uid()) a la permission cabinet spécifiée. OR-aggregated sur tous ses platform_roles. Override: is_platform_owner=true → true partout.';

GRANT EXECUTE ON FUNCTION public.has_cabinet_permission(text) TO authenticated;

-- ============================================================
-- 2. Fonction edge functions — caller fournit user_id explicitement
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_has_cabinet_permission(p_user_id uuid, p_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, is_platform_owner
    FROM public.users
    WHERE id = p_user_id
      AND is_active = true
    LIMIT 1
  )
  SELECT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM me) THEN false
      WHEN (SELECT is_platform_owner FROM me) THEN true
      ELSE COALESCE(
        (
          SELECT bool_or((pr.permissions ->> p_perm)::boolean)
          FROM public.user_platform_roles upr
          JOIN public.platform_roles pr ON pr.id = upr.platform_role_id
          WHERE upr.user_id = p_user_id
        ),
        false
      )
    END;
$$;

COMMENT ON FUNCTION public.user_has_cabinet_permission(uuid, text) IS
  'Variante de has_cabinet_permission où le caller fournit explicitement user_id. Utilisée par les edge functions (service_role bypass auth.uid()).';

GRANT EXECUTE ON FUNCTION public.user_has_cabinet_permission(uuid, text) TO authenticated, service_role;

-- ============================================================
-- 3. Backfill des platform_roles existants (Stratégie B)
-- ============================================================

UPDATE public.platform_roles
SET permissions = permissions || jsonb_build_object(
  'can_delete_mission',     COALESCE((permissions ->> 'can_create_mission')::boolean, false),
  'can_manage_members',     COALESCE((permissions ->> 'can_create_mission')::boolean, false),
  'can_manage_clients',     COALESCE((permissions ->> 'can_create_mission')::boolean, false),
  'can_edit_organization',  COALESCE((permissions ->> 'can_create_mission')::boolean, false),
  'can_manage_roles',       COALESCE((permissions ->> 'can_create_mission')::boolean, false)
)
WHERE NOT (permissions ? 'can_delete_mission');

-- Log de contrôle pour vérification post-migration
DO $$
DECLARE
  v_total int;
  v_migrated int;
BEGIN
  SELECT count(*) INTO v_total FROM public.platform_roles;
  SELECT count(*) INTO v_migrated FROM public.platform_roles WHERE permissions ? 'can_delete_mission';
  RAISE NOTICE '[00082] platform_roles: % total, % avec nouveaux flags', v_total, v_migrated;
END $$;

-- ============================================================
-- 4. Mise à jour de la doc COMMENT sur la colonne permissions
-- ============================================================

COMMENT ON COLUMN public.platform_roles.permissions IS
  'JSON des permissions cabinet. Cabinet flags: can_create_mission, can_assign_team, can_be_lead, can_designate_lead, can_delete_mission, can_manage_members, can_manage_clients, can_edit_organization, can_manage_roles. Group flags (orgs type=groupe uniquement): can_view_supervision, can_create_campaign, can_manage_subsidiaries, can_view_entity_detail.';
