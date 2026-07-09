-- 00145 (DOWN) — restaure la policy 00144 et retire le helper.
drop policy if exists "inc_select_assujetti" on public.incidents;
create policy "inc_select_assujetti"
  on public.incidents for select
  to authenticated
  using (
    public.is_client_role()
    and entity_id = public.get_my_organization_id()
  );

drop function if exists public.get_my_entity_org_ids();
