-- Migration 00237: Lecture des rôles par le super-admin (UP)
-- Description: la console super-admin (onglet Membres d'un cabinet) lit les rôles
-- via user_platform_roles ⨝ platform_roles. Ces deux tables n'avaient que des
-- policies « self » / « same-org » — un super-admin, hors du cabinet ciblé, ne
-- les lisait pas et l'affichage montrait « — » alors que le rôle EST bien
-- attribué. On ajoute une policy SELECT platform-owner (lecture seule), calquée
-- sur users_select_platform_owner (00067). is_platform_owner() est SECURITY
-- DEFINER → pas de récursion RLS.

CREATE POLICY "user_platform_roles_select_platform_owner"
  ON public.user_platform_roles FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());

CREATE POLICY "platform_roles_select_platform_owner"
  ON public.platform_roles FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());
