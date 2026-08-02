-- Migration 00163 (DOWN) : restaure les policies vague 1 sur get_subsidiary_ids.

drop policy if exists "rm_select_regulator" on public.regulatory_measures;
create policy "rm_select_regulator"
  on public.regulatory_measures for select to authenticated
  using (
    not public.is_client_role()
    and entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

drop policy if exists "inc_select_regulator" on public.incidents;
create policy "inc_select_regulator"
  on public.incidents for select to authenticated
  using (
    not public.is_client_role()
    and entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

drop policy if exists "erp_select_regulator" on public.entity_regulatory_profile;
create policy "erp_select_regulator"
  on public.entity_regulatory_profile for select to authenticated
  using (
    not public.is_client_role()
    and organization_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

drop policy if exists "missions_select_group" on public.missions;
create policy "missions_select_group"
  on public.missions for select to authenticated
  using (
    client_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

drop policy if exists "ca_select_group" on public.control_assessments;
create policy "ca_select_group"
  on public.control_assessments for select to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = control_assessments.mission_id
        and m.client_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
    )
  );

drop policy if exists "car_select_group" on public.corrective_action_requests;
create policy "car_select_group"
  on public.corrective_action_requests for select to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = corrective_action_requests.mission_id
        and m.client_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
    )
  );
