-- 00195 — rollback : restaure la version 00194 (accès cross-tenant par org, sans
-- granularité par contrôle/référentiel).

create or replace function public.get_control_policies(p_control_id uuid)
returns table (policy_id uuid, title text, status text, applied boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.title, p.status::text,
    exists (
      select 1 from public.policy_effectiveness_attestations e
      where e.policy_id = p.id and e.status = 'applied'
    ) as applied
  from public.policy_control_links pcl
  join public.policies p on p.id = pcl.policy_id
  where pcl.control_id = p_control_id
    and public.is_aal2()
    and not public.is_client_role()
    and (
      pcl.organization_id = public.get_my_organization_id()
      or pcl.organization_id in (
        select m.client_id
        from public.missions m
        join public.mission_members mm on mm.mission_id = m.id
        where m.cabinet_id = public.get_my_organization_id()
          and mm.user_id = public.get_my_user_id()
          and m.is_active = true
      )
    );
$$;

grant execute on function public.get_control_policies(uuid) to authenticated;
