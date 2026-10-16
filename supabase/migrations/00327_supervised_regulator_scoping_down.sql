-- 00327 (DOWN) - restaure le résolveur de 00326 (grant d'équipe mission sans
-- distinction de mode).

create or replace function public.get_my_supervised_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with me as (
    select public.get_my_organization_id() as org_id, public.get_my_user_id() as user_id
  ),
  org_supervised as (
    select r.target_org_id as id
    from public.organization_relationships r, me
    where r.actor_org_id = me.org_id
      and r.status = 'active'
      and r.nature in ('regulatory_supervision', 'audit_engagement')
    union
    select m.client_id as id
    from public.missions m
    join public.mission_members mm on mm.mission_id = m.id, me
    where m.cabinet_id = me.org_id
      and mm.user_id = me.user_id
      and m.is_active = true
      and m.client_id is not null
  )
  select distinct os.id
  from org_supervised os, me
  where public.is_aal2()
    and not public.is_client_role()
    and (
      public.has_cabinet_permission('can_manage_supervision_assignments')
      or exists (
        select 1 from public.supervision_assignments a
        where a.regulator_org_id = me.org_id
          and a.assignee_user_id = me.user_id
          and a.scope_type = 'org'
          and a.scope_org_id = os.id
      )
      or exists (
        select 1 from public.supervision_assignments a
        join public.organizations o on o.id = os.id
        where a.regulator_org_id = me.org_id
          and a.assignee_user_id = me.user_id
          and a.scope_type = 'sector'
          and a.scope_sector = o.sector
      )
      or exists (
        select 1 from public.missions m
        join public.mission_members mm on mm.mission_id = m.id
        where m.cabinet_id = me.org_id
          and mm.user_id = me.user_id
          and m.is_active = true
          and m.client_id = os.id
      )
    );
$$;
revoke all on function public.get_my_supervised_org_ids() from public;
grant execute on function public.get_my_supervised_org_ids() to authenticated;
