-- Migration: maintien courant du graphe de relations (P0.2, RFC 0007) — DOWN
-- Restaure sync_org_parent_edge en INSERT-only (etat 00206) et retire le trigger
-- mission. Les aretes deja creees sont conservees (additives).

drop trigger if exists trg_sync_mission_engagement_edge on public.missions;
drop function if exists public.sync_mission_engagement_edge();

create or replace function public.sync_org_parent_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nature public.relationship_nature;
begin
  if new.parent_org_id is not null then
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
  after insert on public.organizations
  for each row execute function public.sync_org_parent_edge();
