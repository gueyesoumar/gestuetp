-- 00326 - Gëstu Risk : affectations de supervision.
--
-- Le régulateur peut confier le suivi de SECTEURS ou d'ASSUJETTIS précis à une
-- ressource (membre) de son organisation. Deux couches :
--   1. PÉRIMÈTRE de l'Autorité (niveau org) = graphe organization_relationships
--      (nature regulatory_supervision/audit_engagement) UNION missions Comply actives.
--      -> module-agnostique : Risk solo (graphe seul) et Comply solo (missions) OK.
--   2. RESPONSABILITÉ du MEMBRE = table supervision_assignments (org ou secteur).
--      Un membre sans affectation ne voit rien (D3) ; un admin (permission
--      can_manage_supervision_assignments) voit tout le périmètre ; un membre
--      d'une mission Comply garde l'accès à son assujetti (grant d'équipe).
-- Affectation secteur = DYNAMIQUE : couvre les futurs assujettis du secteur (D4).
--
-- La RLS des tables risk reste org-scoped ; la lecture cross-org passe UNIQUEMENT
-- par les RPC SECURITY DEFINER existants, qui dérivent tous de get_my_supervised_org_ids().

-- -- 1. Table -------------------------------------------------------------------
create table if not exists public.supervision_assignments (
  id uuid primary key default gen_random_uuid(),
  regulator_org_id uuid not null references public.organizations(id) on delete cascade,
  assignee_user_id uuid not null references public.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('org', 'sector')),
  scope_org_id uuid references public.organizations(id) on delete cascade,
  scope_sector text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint supervision_assignment_scope_consistency check (
    (scope_type = 'org' and scope_org_id is not null and scope_sector is null)
    or (scope_type = 'sector' and scope_sector is not null and scope_org_id is null)
  )
);

comment on table public.supervision_assignments is
  'Affectations de supervision : un membre du régulateur se voit confier un assujetti (scope org) ou un secteur (scope sector). Restreint (jamais n''élargit) le périmètre org au sein de get_my_supervised_org_ids.';

create index if not exists idx_sup_assign_org on public.supervision_assignments(regulator_org_id);
create index if not exists idx_sup_assign_user on public.supervision_assignments(assignee_user_id);
create unique index if not exists uq_sup_assign_org
  on public.supervision_assignments(regulator_org_id, assignee_user_id, scope_org_id)
  where scope_type = 'org';
create unique index if not exists uq_sup_assign_sector
  on public.supervision_assignments(regulator_org_id, assignee_user_id, scope_sector)
  where scope_type = 'sector';

alter table public.supervision_assignments enable row level security;

-- Lecture : membres non-client de l'org régulatrice (voir ses propres affectations
-- et, pour un admin, celles de toute l'org). get_my_organization_id() est SECURITY
-- DEFINER (pas de récursion). role=client -> NULL -> aucune ligne.
create policy "sup_assign_select_own_org" on public.supervision_assignments
  for select to authenticated
  using (
    regulator_org_id = public.get_my_organization_id()
    and not public.is_client_role()
  );

-- Écritures : AUCUNE policy authenticated. Passent par les RPC SECURITY DEFINER
-- ci-dessous (vérifient la permission + le périmètre). Cohérent avec le pattern
-- "écritures sensibles via RPC/service_role".

-- RESTRICTIVE AAL2 : aucune opération sans session de niveau AAL2.
create policy "sup_assign_require_aal2" on public.supervision_assignments
  as restrictive for all to authenticated
  using (public.is_aal2()) with check (public.is_aal2());

-- -- 2. Permission --------------------------------------------------------------
-- Attribuée aux rôles qui peuvent déjà gérer les rôles (admins). Les owners
-- l'ont via is_platform_owner.
update public.platform_roles
set permissions = permissions || '{"can_manage_supervision_assignments": true}'::jsonb
where coalesce((permissions->>'can_manage_roles')::boolean, false) = true;

-- -- 3. Résolveur : graphe + missions, borné par les affectations du membre -----
create or replace function public.get_my_supervised_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with me as (
    select public.get_my_organization_id() as org_id, public.get_my_user_id() as user_id
  ),
  -- Périmètre org de l'Autorité : graphe (module-agnostique) UNION missions Comply.
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
      -- Admin : voit tout le périmètre.
      public.has_cabinet_permission('can_manage_supervision_assignments')
      -- Affectation sur cet assujetti précis.
      or exists (
        select 1 from public.supervision_assignments a
        where a.regulator_org_id = me.org_id
          and a.assignee_user_id = me.user_id
          and a.scope_type = 'org'
          and a.scope_org_id = os.id
      )
      -- Affectation sur le secteur de cet assujetti (dynamique).
      or exists (
        select 1 from public.supervision_assignments a
        join public.organizations o on o.id = os.id
        where a.regulator_org_id = me.org_id
          and a.assignee_user_id = me.user_id
          and a.scope_type = 'sector'
          and a.scope_sector = o.sector
      )
      -- Grant d'équipe Comply : membre d'une mission active sur cet assujetti.
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

-- -- 4. RPC de gestion des affectations ----------------------------------------
-- Lecture enrichie (nom/email du membre + libellé de périmètre). Bornée à l'org.
create or replace function public.get_supervision_assignments()
returns table (
  id uuid, assignee_user_id uuid, assignee_name text, assignee_email text,
  scope_type text, scope_org_id uuid, scope_label text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.assignee_user_id,
    trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')),
    u.email, a.scope_type, a.scope_org_id,
    case when a.scope_type = 'org' then o.name else a.scope_sector end,
    a.created_at
  from public.supervision_assignments a
  join public.users u on u.id = a.assignee_user_id
  left join public.organizations o on o.id = a.scope_org_id
  where a.regulator_org_id = public.get_my_organization_id()
    and public.is_aal2()
    and not public.is_client_role()
  order by u.last_name, u.first_name, scope_label;
$$;
revoke all on function public.get_supervision_assignments() from public;
grant execute on function public.get_supervision_assignments() to authenticated;

-- Ajout : vérifie la permission + que le périmètre (org/secteur) est légitime.
create or replace function public.add_supervision_assignment(
  p_user_id uuid, p_scope_type text, p_scope_org_id uuid default null, p_scope_sector text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public.get_my_organization_id();
  v_id uuid;
begin
  if not public.is_aal2() or public.is_client_role()
     or not public.has_cabinet_permission('can_manage_supervision_assignments') then
    raise exception 'not authorized';
  end if;
  -- Le membre doit appartenir à l'org régulatrice.
  if not exists (select 1 from public.users u where u.id = p_user_id and u.organization_id = v_org and u.is_active) then
    raise exception 'invalid member';
  end if;
  if p_scope_type = 'org' then
    if p_scope_org_id is null then raise exception 'org required'; end if;
    insert into public.supervision_assignments
      (regulator_org_id, assignee_user_id, scope_type, scope_org_id, created_by)
    values (v_org, p_user_id, 'org', p_scope_org_id, public.get_my_user_id())
    on conflict do nothing
    returning id into v_id;
  elsif p_scope_type = 'sector' then
    if p_scope_sector is null then raise exception 'sector required'; end if;
    insert into public.supervision_assignments
      (regulator_org_id, assignee_user_id, scope_type, scope_sector, created_by)
    values (v_org, p_user_id, 'sector', p_scope_sector, public.get_my_user_id())
    on conflict do nothing
    returning id into v_id;
  else
    raise exception 'invalid scope';
  end if;
  return v_id;
end;
$$;
revoke all on function public.add_supervision_assignment(uuid, text, uuid, text) from public;
grant execute on function public.add_supervision_assignment(uuid, text, uuid, text) to authenticated;

-- Retrait : par id, borné à l'org + permission.
create or replace function public.remove_supervision_assignment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_aal2() or public.is_client_role()
     or not public.has_cabinet_permission('can_manage_supervision_assignments') then
    raise exception 'not authorized';
  end if;
  delete from public.supervision_assignments
  where id = p_id and regulator_org_id = public.get_my_organization_id();
end;
$$;
revoke all on function public.remove_supervision_assignment(uuid) from public;
grant execute on function public.remove_supervision_assignment(uuid) to authenticated;
