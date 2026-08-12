-- Migration: platform_roles_policy_cleanup (UP)
-- Cosmétique / déterminisme du schéma (audit OWASP 2026-08-11, suite de E1).
--
-- Après 00170, il subsiste DEUX jeux de policies d'écriture équivalents sur
-- platform_roles : `platform_roles_*_org_members` (versionnées, gatées par 00170)
-- et `platform_roles_*_can_manage_roles` (ajoutées hors-versioning par une
-- remédiation antérieure, elles aussi gatées). Les deux sont sûres (toutes gatées
-- par has_cabinet_permission('can_manage_roles')), mais la redondance est source de
-- confusion. On supprime le jeu non-versionné pour ne garder qu'une source de vérité.
-- Aucun impact sécurité (les `*_org_members` gatées restent).

drop policy if exists "platform_roles_insert_can_manage_roles" on public.platform_roles;
drop policy if exists "platform_roles_update_can_manage_roles" on public.platform_roles;
drop policy if exists "platform_roles_delete_can_manage_roles" on public.platform_roles;
