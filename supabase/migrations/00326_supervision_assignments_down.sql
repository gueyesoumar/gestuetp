-- 00326 (DOWN) - retrait des affectations de supervision.

drop function if exists public.remove_supervision_assignment(uuid);
drop function if exists public.add_supervision_assignment(uuid, text, uuid, text);
drop function if exists public.get_supervision_assignments();

-- Restaure le résolveur missions-only (état 00317).
create or replace function public.get_my_supervised_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct m.client_id
  from public.missions m
  join public.mission_members mm on mm.mission_id = m.id
  where m.cabinet_id = public.get_my_organization_id()
    and mm.user_id = public.get_my_user_id()
    and m.is_active = true
    and m.client_id is not null
    and public.is_aal2()
    and not public.is_client_role();
$$;
revoke all on function public.get_my_supervised_org_ids() from public;
grant execute on function public.get_my_supervised_org_ids() to authenticated;

update public.platform_roles
set permissions = permissions - 'can_manage_supervision_assignments'
where permissions ? 'can_manage_supervision_assignments';

drop table if exists public.supervision_assignments;
