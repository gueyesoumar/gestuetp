-- Migration: users_privilege_guard (UP)
-- Sévérité : CRITIQUE (audit OWASP 2026-08-11, constat C1 / A01).
--
-- Problème : la policy RLS `users_update_self` (00003) est row-level, pas
-- column-level. Elle autorise un `authenticated` à modifier TOUTES les colonnes de
-- sa propre ligne `users`, dont `is_platform_owner`, `role`, `organization_id`,
-- `client_org_id`. N'importe quel compte (y compris un client portail) pouvait donc
--   update public.users set is_platform_owner = true where auth_id = auth.uid();
-- -> se faire super-admin, sauter de tenant, ou sortir de la neutralisation cp_*.
--
-- Correctif : trigger BEFORE UPDATE qui refuse tout changement de ces colonnes
-- de privilège/tenant lorsque l'appelant est le rôle `authenticated`. Les rôles
-- `service_role` (Edge Functions d'administration : manage-member, invite, reset,
-- create_mission_tx, etc.) et `postgres` (migrations) ne sont PAS concernés et
-- gardent la main sur ces colonnes. L'édition de profil (first_name, last_name,
-- phone, job_title, avatar_url) reste autorisée.
--
-- Robustesse : basé sur `current_user` (rôle Postgres effectif posé par PostgREST
-- via SET LOCAL ROLE) -> insensible à un éventuel re-GRANT ultérieur. Le trigger
-- est SECURITY INVOKER (défaut) : NE PAS le passer en SECURITY DEFINER, sinon
-- `current_user` deviendrait le propriétaire de la fonction et la garde sauterait.

create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Seul un utilisateur applicatif standard (`authenticated`) est bridé.
  -- service_role et postgres passent (opérations d'admin / migrations légitimes).
  if current_user = 'authenticated' then
    if new.is_platform_owner is distinct from old.is_platform_owner
       or new.role            is distinct from old.role
       or new.organization_id is distinct from old.organization_id
       or new.client_org_id   is distinct from old.client_org_id
       or new.is_active       is distinct from old.is_active then
      raise exception 'Modification interdite : les colonnes de privilège/tenant de users sont réservées au service_role'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.guard_users_privileged_columns() is
  'Garde C1 (OWASP A01) : empêche un rôle authenticated de modifier is_platform_owner/role/organization_id/client_org_id/is_active sur sa propre ligne users. service_role et postgres non concernés.';

drop trigger if exists trg_guard_users_privileged_columns on public.users;
create trigger trg_guard_users_privileged_columns
  before update on public.users
  for each row execute function public.guard_users_privileged_columns();
