-- Migration 00082: Système de permissions cabinet — DOWN
--
-- Retire les fonctions has_cabinet_permission/user_has_cabinet_permission
-- et restaure les permissions existantes en supprimant les 5 nouveaux flags
-- ajoutés par la migration UP.

-- 1. Drop des fonctions (les RLS qui en dépendent doivent déjà être restaurées
--    par 00083_cabinet_rls_rewrites_down.sql, donc on peut drop sans CASCADE)
DROP FUNCTION IF EXISTS public.user_has_cabinet_permission(uuid, text);
DROP FUNCTION IF EXISTS public.has_cabinet_permission(text);

-- 2. Retirer les 5 nouveaux flags des permissions existantes
UPDATE public.platform_roles
SET permissions = permissions
  - 'can_delete_mission'
  - 'can_manage_members'
  - 'can_manage_clients'
  - 'can_edit_organization'
  - 'can_manage_roles'
WHERE permissions ? 'can_delete_mission';

-- 3. Restaurer le commentaire d'origine (vide ou approximatif — sans historique)
COMMENT ON COLUMN public.platform_roles.permissions IS
  'Ex: {"can_create_mission": true, "can_assign_team": true, "can_be_lead": true, "can_designate_lead": false}';
