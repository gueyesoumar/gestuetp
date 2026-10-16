-- 00327 - Gëstu Risk : le scoping par affectation doit primer chez le régulateur.
--
-- Constat (snayz) : un membre du régulateur affecté UNIQUEMENT à un assujetti voyait
-- aussi les assujettis de ses missions Comply actives (branche « grant d'équipe »).
-- Chez un régulateur, la supervision est historiquement portée par des missions, donc
-- cette branche court-circuitait l'affectation et violait D3 (« sans affectation = rien »).
--
-- Correctif : distinguer le MODE de l'organisation via my_capabilities() :
--   - MODE RÉGULATEUR (capacité 'supervision') : le membre ne voit QUE ce que ses
--     affectations couvrent (ou tout s'il a can_manage_supervision_assignments).
--     L'appartenance à une mission N'OUVRE PLUS l'assujetti.
--   - MODE CABINET (sans 'supervision') : comportement inchangé (grant d'équipe par
--     mission conservé) -> aucune régression pour les cabinets Comply.
-- Les missions restent dans le PÉRIMÈTRE (un assujetti créé via mission reste
-- affectable), mais, en mode régulateur, l'appartenance ne vaut plus autorisation.

create or replace function public.get_my_supervised_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with me as (
    select public.get_my_organization_id() as org_id, public.get_my_user_id() as user_id
  ),
  mode as (
    select exists (
      select 1 from public.my_capabilities() c where c = 'supervision'::public.org_capability
    ) as is_regulator
  ),
  org_supervised as (
    select r.target_org_id as id
    from public.organization_relationships r, me
    where r.actor_org_id = me.org_id and r.status = 'active'
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
  from org_supervised os, me, mode
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
      -- Grant d'équipe Comply : UNIQUEMENT en mode cabinet (jamais régulateur).
      or (
        not mode.is_regulator
        and exists (
          select 1 from public.missions m
          join public.mission_members mm on mm.mission_id = m.id
          where m.cabinet_id = me.org_id
            and mm.user_id = me.user_id
            and m.is_active = true
            and m.client_id = os.id
        )
      )
    );
$$;
revoke all on function public.get_my_supervised_org_ids() from public;
grant execute on function public.get_my_supervised_org_ids() to authenticated;
