-- Migration 00224 (DOWN) — P4b (RFC 0007). Restaure parent_org_id depuis le graphe.

alter table public.organizations
  add column if not exists parent_org_id uuid references public.organizations(id) on delete set null;
create index if not exists idx_organizations_parent on public.organizations(parent_org_id);

-- Backfill : parent = acteur de l'arête de hiérarchie entrante.
update public.organizations o
set parent_org_id = r.actor_org_id
from public.organization_relationships r
where r.target_org_id = o.id and r.status = 'active'
  and r.nature in ('group_ownership', 'regulatory_supervision');

-- Restaure la policy audit_campaigns filiale (lecture directe parent_org_id).
drop policy if exists "campaigns_select_subsidiary" on public.audit_campaigns;
create policy "campaigns_select_subsidiary" on public.audit_campaigns for select to authenticated
  using (organization_id in (
    select parent_org_id from public.organizations
    where id = public.get_my_organization_id() and parent_org_id is not null
  ));

-- get_entity_descendants → parent_org_id (00136).
create or replace function public.get_entity_descendants(parent_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive tree as (
    select id from public.organizations where parent_org_id = parent_id
    union
    select o.id from public.organizations o join tree t on o.parent_org_id = t.id
  )
  select id from tree;
$$;

-- Restaure le trigger de sync (00213).
create or replace function public.sync_org_parent_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nature public.relationship_nature;
begin
  if tg_op = 'UPDATE' and old.parent_org_id is distinct from new.parent_org_id
     and old.parent_org_id is not null then
    update public.organization_relationships
      set status = 'ended', ended_at = now()
      where actor_org_id = old.parent_org_id and target_org_id = new.id
        and nature in ('group_ownership', 'regulatory_supervision') and status = 'active';
  end if;
  if new.parent_org_id is not null
     and (tg_op = 'INSERT' or old.parent_org_id is distinct from new.parent_org_id) then
    v_nature := case when exists (
        select 1 from public.organization_capabilities oc
        where oc.org_id = new.parent_org_id and oc.capability = 'supervision' and oc.status = 'active')
      then 'regulatory_supervision'::public.relationship_nature
      else 'group_ownership'::public.relationship_nature end;
    insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
    values (new.parent_org_id, new.id, v_nature, 'active') on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists trg_sync_org_parent_edge on public.organizations;
create trigger trg_sync_org_parent_edge
  after insert or update of parent_org_id on public.organizations
  for each row execute function public.sync_org_parent_edge();
