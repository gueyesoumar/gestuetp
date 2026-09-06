-- Migration: maintien courant du graphe de relations (P0.2, RFC 0007) — UP
-- Comble deux trous de synchro : (1) arete audit_engagement sur missions,
-- (2) re-parentage (UPDATE parent_org_id). + backfill idempotent.
-- Triggers SECURITY DEFINER (ecriture organization_relationships reservee au
-- service_role), search_path fixe, aucun SQL dynamique, aucune policy modifiee.

-- 1) sync_org_parent_edge : gere desormais INSERT ET UPDATE de parent_org_id.
create or replace function public.sync_org_parent_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nature public.relationship_nature;
begin
  -- Cloture de l'ancienne arete lors d'un re-parentage / detachement.
  if tg_op = 'UPDATE' and old.parent_org_id is distinct from new.parent_org_id
     and old.parent_org_id is not null then
    update public.organization_relationships
      set status = 'ended', ended_at = now()
      where actor_org_id = old.parent_org_id and target_org_id = new.id
        and nature in ('group_ownership', 'regulatory_supervision')
        and status = 'active';
  end if;
  -- Creation/maintien de l'arete vers le parent (nouveau ou a l'insertion).
  if new.parent_org_id is not null
     and (tg_op = 'INSERT' or old.parent_org_id is distinct from new.parent_org_id) then
    v_nature := case when exists (
        select 1 from public.organization_capabilities oc
        where oc.org_id = new.parent_org_id and oc.capability = 'supervision' and oc.status = 'active')
      then 'regulatory_supervision'::public.relationship_nature
      else 'group_ownership'::public.relationship_nature end;
    insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
    values (new.parent_org_id, new.id, v_nature, 'active')
    on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_org_parent_edge on public.organizations;
create trigger trg_sync_org_parent_edge
  after insert or update of parent_org_id on public.organizations
  for each row execute function public.sync_org_parent_edge();

-- 2) Arete audit_engagement a la creation d'une mission (cabinet -> client).
--    Un engagement actif par paire (cabinet, client) ; les missions s'y rattachent.
create or replace function public.sync_mission_engagement_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_edge uuid;
begin
  if new.cabinet_id is not null and new.client_id is not null and new.cabinet_id <> new.client_id then
    insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
    values (new.cabinet_id, new.client_id, 'audit_engagement', 'active')
    on conflict do nothing;
    select id into v_edge from public.organization_relationships
      where actor_org_id = new.cabinet_id and target_org_id = new.client_id
        and nature = 'audit_engagement' and status = 'active'
      limit 1;
    new.engagement_id := coalesce(new.engagement_id, v_edge);
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_mission_engagement_edge on public.missions;
create trigger trg_sync_mission_engagement_edge
  before insert on public.missions
  for each row execute function public.sync_mission_engagement_edge();

-- 3) Backfill idempotent : missions existantes sans arete audit_engagement.
insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
select distinct m.cabinet_id, m.client_id,
  'audit_engagement'::public.relationship_nature, 'active'::public.relationship_status
from public.missions m
where m.cabinet_id is not null and m.client_id is not null and m.cabinet_id <> m.client_id
  and not exists (
    select 1 from public.organization_relationships r
    where r.actor_org_id = m.cabinet_id and r.target_org_id = m.client_id
      and r.nature = 'audit_engagement' and r.status = 'active');

update public.missions m
  set engagement_id = r.id
from public.organization_relationships r
where r.actor_org_id = m.cabinet_id and r.target_org_id = m.client_id
  and r.nature = 'audit_engagement' and r.status = 'active'
  and m.engagement_id is null;
