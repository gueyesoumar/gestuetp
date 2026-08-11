-- Migration: users_privilege_guard (DOWN)
-- Rollback du garde C1. ATTENTION : rétablit la faille d'élévation de privilège
-- (un authenticated pourrait de nouveau modifier is_platform_owner/role/
-- organization_id/client_org_id sur sa propre ligne). Ne dérouler qu'en cas de
-- régression avérée.

drop trigger if exists trg_guard_users_privileged_columns on public.users;
drop function if exists public.guard_users_privileged_columns();
