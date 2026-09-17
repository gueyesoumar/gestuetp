-- Migration 00251 (DOWN)

-- 1) Restaurer le trigger de snapshot d'origine (00181, sans disabled_steps)
--    AVANT de retirer la table/colonne qu'il référence.
create or replace function public.mission_snapshot_workflow_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.workflow_version := coalesce(
    (select o.workflow_version from public.organizations o where o.id = new.cabinet_id),
    'audit');
  return new;
end $$;

-- 2) Retirer le snapshot par mission
alter table public.missions drop column if exists workflow_disabled_steps;

-- 3) Retirer la table (cascade : policies, index, trigger updated_at)
drop table if exists public.organization_workflow_templates;

-- 4) Retirer la permission ajoutée
update public.platform_roles
set permissions = permissions - 'can_manage_workflow'
where permissions ? 'can_manage_workflow';
