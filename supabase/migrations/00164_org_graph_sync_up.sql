-- Migration 00164 (UP) : maintien AUTOMATIQUE du graphe d'org + capacités (RFC 0001).
--
-- REQUIS après P3a vague 1 (00163) : les policies staff-sortant lisent désormais
-- `visible_target_ids()`, qui parcourt `organization_relationships`. Or le graphe
-- n'était peuplé que par le backfill unique 00157 -> une org créée APRÈS (via
-- manage-entity ou un seed) n'a PAS d'arête -> son parent (régulateur/groupe) ne
-- la voit plus (RLS bloque). Ce trigger maintient l'arête + les capacités sur le
-- cycle de vie -> le modèle devient auto-maintenu, et visible_target_ids reste
-- équivalent à get_subsidiary_ids même pour les créations futures.

-- 1) Arête parent depuis parent_org_id (nature dérivée de l'ÉDITION du parent) ---
create or replace function public.sync_org_parent_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nature public.relationship_nature;
begin
  if new.parent_org_id is not null then
    select case when o.edition = 'regul' then 'regulatory_supervision'::public.relationship_nature
                else 'group_ownership'::public.relationship_nature end
      into v_nature
    from public.organizations o where o.id = new.parent_org_id;

    insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
    values (new.parent_org_id, new.id, coalesce(v_nature, 'group_ownership'::public.relationship_nature), 'active')
    on conflict do nothing;  -- unique index sur arête active (00156)
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_org_parent_edge on public.organizations;
create trigger trg_sync_org_parent_edge
  after insert on public.organizations
  for each row execute function public.sync_org_parent_edge();

-- 2) Capacités depuis l'édition ------------------------------------------------
create or replace function public.sync_org_capabilities()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organization_capabilities (org_id, capability, status)
  select new.id, cap, 'active'::public.capability_status
  from public.editions e
  cross join lateral unnest(e.capabilities) as cap
  where e.key = new.edition
  on conflict (org_id, capability) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_sync_org_capabilities on public.organizations;
create trigger trg_sync_org_capabilities
  after insert on public.organizations
  for each row execute function public.sync_org_capabilities();

comment on function public.sync_org_parent_edge() is
  'Maintient l''arête organization_relationships (parent->enfant) à la création d''une org, nature dérivée de l''édition du parent. Requis pour que visible_target_ids (RLS par arête) reste correct sur les créations futures.';
comment on function public.sync_org_capabilities() is
  'Peuple organization_capabilities depuis l''édition de l''org à sa création.';
