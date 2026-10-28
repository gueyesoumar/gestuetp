-- 00369 (UP) - RFC 0022 Lot 3 : désactivation guidée des secteurs.
--
-- Avant d'archiver un secteur utilisé, le front propose de réaffecter ses entités, modèles
-- et affectations vers un autre secteur. Deux RPC, clé = libellé (Option A, RFC 0022 §4) :
--   - get_sector_usage : compte l'usage d'un libellé dans le périmètre de l'appelant.
--   - reassign_sector  : réécrit A -> B (propagation + déduplication), scopé au tenant.
-- SECURITY DEFINER contourne la RLS, donc les gardes (AAL2, can_manage_sectors, non-client)
-- et le périmètre tenant sont portés EXPLICITEMENT ici. Scope entités = sous-arbre de
-- gouvernance (get_entity_descendants, aligné sur l'edge manage-entity).

create or replace function public.get_sector_usage(p_label text)
returns table (entities int, templates int, assignments int)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.organizations o
      where o.sector = p_label
        and o.id in (select public.get_entity_descendants(public.get_my_organization_id()))),
    (select count(*)::int from public.risk_scenario_templates t
      where t.owner_org_id = public.get_my_organization_id()
        and p_label = any (t.sectors)),
    (select count(*)::int from public.supervision_assignments a
      where a.regulator_org_id = public.get_my_organization_id()
        and a.scope_type = 'sector' and a.scope_sector = p_label)
  where public.is_aal2() and not public.is_client_role();
$$;
revoke all on function public.get_sector_usage(text) from public;
grant execute on function public.get_sector_usage(text) to authenticated;

create or replace function public.reassign_sector(p_from text, p_to text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid := public.get_my_organization_id();
begin
  if not public.is_aal2() or public.is_client_role()
     or not public.has_cabinet_permission('can_manage_sectors') then
    raise exception 'not authorized';
  end if;
  if coalesce(btrim(p_from), '') = '' or coalesce(btrim(p_to), '') = '' then
    raise exception 'libelles requis';
  end if;
  if p_from = p_to then return; end if;

  -- (1) organizations.sector : sous-arbre de gouvernance de l'appelant.
  update public.organizations
    set sector = p_to
  where sector = p_from
    and id in (select public.get_entity_descendants(v_org));

  -- (2) supervision_assignments.scope_sector : affectations possédées par mon org.
  -- On retire d'abord les lignes qui violeraient l'unicité (regulator, assignee, scope_sector).
  delete from public.supervision_assignments a
  where a.regulator_org_id = v_org and a.scope_type = 'sector' and a.scope_sector = p_from
    and exists (
      select 1 from public.supervision_assignments b
      where b.regulator_org_id = v_org and b.scope_type = 'sector'
        and b.scope_sector = p_to and b.assignee_user_id = a.assignee_user_id);
  update public.supervision_assignments
    set scope_sector = p_to
  where regulator_org_id = v_org and scope_type = 'sector' and scope_sector = p_from;

  -- (3) risk_scenario_templates.sectors[] : mes modèles, avec déduplication du tableau.
  update public.risk_scenario_templates t
    set sectors = (
      select coalesce(array_agg(distinct s), '{}')
      from unnest(array_replace(t.sectors, p_from, p_to)) as s
    )
  where t.owner_org_id = v_org and p_from = any (t.sectors);
end
$$;
revoke all on function public.reassign_sector(text, text) from public;
grant execute on function public.reassign_sector(text, text) to authenticated;
