-- Migration 00219 (DOWN) — P2.2a (RFC 0007).
-- Restaure les policies XOR (cabinet_client_id/entity_org_id) + la FK vers
-- cabinet_clients + retire NOT NULL. Le remap users.client_org_id (org → fiche.id)
-- est BEST-EFFORT : un client auditable par plusieurs cabinets a plusieurs fiches,
-- on en choisit une. À réserver au rollback de staging.

alter table public.client_portal_contacts alter column client_org_id drop not null;

-- users : org → une fiche correspondante (best-effort) ; FK ré-ancrée sur cabinet_clients.
do $$
declare cname text;
begin
  select con.conname into cname from pg_constraint con
  where con.conrelid = 'public.users'::regclass and con.contype = 'f'
    and con.conkey = array[(select attnum from pg_attribute
      where attrelid = 'public.users'::regclass and attname = 'client_org_id')];
  if cname is not null then execute format('alter table public.users drop constraint %I', cname); end if;
end $$;
update public.users u
set client_org_id = (
  select cc.id from public.cabinet_clients cc where cc.client_org_id = u.client_org_id limit 1
)
where u.role = 'client' and u.client_org_id is not null
  and exists (select 1 from public.cabinet_clients cc where cc.client_org_id = u.client_org_id);
alter table public.users
  add constraint users_client_org_id_fkey
  foreign key (client_org_id) references public.cabinet_clients(id) on delete set null;

-- Policies staff cpc (cabinet_client_id).
drop policy if exists "cpc_select_cabinet" on public.client_portal_contacts;
create policy "cpc_select_cabinet" on public.client_portal_contacts for select to authenticated
  using (cabinet_client_id in (select cc.id from public.cabinet_clients cc where cc.cabinet_id = public.get_my_organization_id()));
drop policy if exists "cpc_insert_cabinet" on public.client_portal_contacts;
create policy "cpc_insert_cabinet" on public.client_portal_contacts for insert to authenticated
  with check (cabinet_client_id in (select cc.id from public.cabinet_clients cc where cc.cabinet_id = public.get_my_organization_id()));
drop policy if exists "cpc_update_cabinet" on public.client_portal_contacts;
create policy "cpc_update_cabinet" on public.client_portal_contacts for update to authenticated
  using (cabinet_client_id in (select cc.id from public.cabinet_clients cc where cc.cabinet_id = public.get_my_organization_id()));
drop policy if exists "cpc_delete_cabinet" on public.client_portal_contacts;
create policy "cpc_delete_cabinet" on public.client_portal_contacts for delete to authenticated
  using (cabinet_client_id in (select cc.id from public.cabinet_clients cc where cc.cabinet_id = public.get_my_organization_id()));

drop policy if exists "cpc_select_own_org" on public.client_portal_contacts;
create policy "cpc_select_own_org" on public.client_portal_contacts for select to authenticated
  using (
    (cabinet_client_id is not null and cabinet_client_id = (select u.client_org_id from public.users u where u.auth_id = auth.uid() and u.role = 'client' limit 1))
    or (entity_org_id is not null and entity_org_id = (select u.client_org_id from public.users u where u.auth_id = auth.uid() and u.role = 'client' limit 1))
  );

drop policy if exists "cpc_select_regulator_subtree" on public.client_portal_contacts;
create policy "cpc_select_regulator_subtree" on public.client_portal_contacts for select to authenticated
  using (entity_org_id is not null and entity_org_id in (select public.get_subsidiary_ids(public.get_my_organization_id())));

drop policy if exists "cp_audit_history_select" on public.audit_history;
create policy "cp_audit_history_select" on public.audit_history for select to authenticated
  using (
    public.is_client_role()
    and cabinet_client_id in (select u.client_org_id from public.users u where u.id = public.get_my_user_id() and u.role = 'client')
  );

create or replace function public.get_my_client_visible_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cc.cabinet_id from public.cabinet_clients cc
  join public.client_portal_contacts cpc on cpc.cabinet_client_id = cc.id
  where cpc.user_id = public.get_my_user_id()
  union
  select cc.client_org_id from public.cabinet_clients cc
  join public.client_portal_contacts cpc on cpc.cabinet_client_id = cc.id
  where cpc.user_id = public.get_my_user_id();
$$;
