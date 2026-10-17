-- 00332 (DOWN) - restaure can_supervise_org (missions-only, 00316) et add_directive_evidence (00328).
create or replace function public.can_supervise_org(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_aal2()
     and not public.is_client_role()
     and exists (
       select 1
       from public.missions m
       join public.mission_members mm on mm.mission_id = m.id
       where m.cabinet_id = public.get_my_organization_id()
         and mm.user_id = public.get_my_user_id()
         and m.is_active = true
         and m.client_id = p_org
     );
$$;
revoke all on function public.can_supervise_org(uuid) from public;
grant execute on function public.can_supervise_org(uuid) to authenticated;

create or replace function public.add_directive_evidence(p_action uuid, p_path text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select organization_id into v_org from public.risk_treatment_actions
    where id = p_action and origin = 'supervisor_directive';
  if v_org is null then raise exception 'not found'; end if;
  if not public.is_client_role() or v_org not in (select public.get_my_portal_org_ids()) then
    raise exception 'not authorized';
  end if;
  insert into public.risk_directive_evidence (action_id, file_path, file_name, uploaded_by)
  values (p_action, p_path, p_name, public.get_my_user_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_directive_evidence(uuid, text, text) from public;
grant execute on function public.add_directive_evidence(uuid, text, text) to authenticated;
