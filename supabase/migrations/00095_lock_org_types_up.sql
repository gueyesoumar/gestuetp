-- Migration 00095: Verrou trigger sur organizations.types — UP
--
-- Empêche tout user authenticated de modifier la colonne types via une
-- requête directe (côté client Supabase ou via une RLS UPDATE qui le
-- permettrait). Seul le service-role (auth.uid() IS NULL) peut écrire,
-- via l'edge function admin-update-organization qui contrôle déjà la
-- garde super-admin et logge dans admin_audit_log.
--
-- Pourquoi : la policy organizations_update_can_edit (00083) autorise un
-- membre de cabinet avec can_edit_organization à modifier ses propres
-- champs, dont types. Sans ce verrou, un cabinet pourrait théoriquement
-- s'auto-octroyer 'group' ou 'platform' et accéder aux fonctionnalités
-- correspondantes. Le trigger ferme cette voie.

CREATE OR REPLACE FUNCTION public.prevent_org_types_change_by_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- service_role n'a pas auth.uid() → autorisé.
  -- user authenticated → bloqué dès qu'il touche types.
  IF OLD.types IS DISTINCT FROM NEW.types AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Modification de types réservée à l''équipe Gëstu (admin-update-organization)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_org_types_change_by_user() IS
  'Bloque toute modification de organizations.types par un user authenticated. Seul le service-role (edge function admin-update-organization) peut écrire.';

DROP TRIGGER IF EXISTS trg_organizations_lock_types ON public.organizations;

CREATE TRIGGER trg_organizations_lock_types
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_org_types_change_by_user();
