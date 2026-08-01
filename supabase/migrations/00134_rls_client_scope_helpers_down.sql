-- Rollback 00134 : restaure les helpers d'origine (role-blind) + findings_select_client
-- sans garde, et supprime les policies cp_* ajoutees. ATTENTION : réintroduit la
-- fuite client (passe 2).

create or replace function public.get_my_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.users
  where auth_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.get_my_mission_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select mission_id
  from public.mission_members
  where user_id = public.get_my_user_id();
$$;

drop policy if exists "findings_select_client" on public.assessment_findings;
create policy "findings_select_client"
  on public.assessment_findings for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      join public.users u on u.organization_id = m.client_id
      where ca.id = assessment_findings.assessment_id
        and u.auth_id = auth.uid()
        and u.is_active = true
        and ca.status in ('approved', 'in_review')
    )
  );

drop policy if exists "cp_findings_select" on public.assessment_findings;
drop policy if exists "cp_comments_select" on public.comments;
