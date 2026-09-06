-- Migration 00219 (UP) — P2.2a (RFC 0007) : bascule RLS sur client_org_id unifié.
-- users.client_org_id passe de cabinet_clients.id → organizations.id (partie auditée
-- = nœud). Toutes les policies portail/audit qui reposaient sur l'ancien sens sont
-- réécrites sur client_org_id. Les anciennes colonnes cpc (cabinet_client_id,
-- entity_org_id) RESTENT (retrait + repoint lecteurs = P2.2b). Isolation vérifiée
-- au harness après déploiement.

-- ── Part A : users.client_org_id → organizations.id ─────────────────────────────
-- 1) D'ABORD retirer l'ancienne FK (→ cabinet_clients) : le backfill va écrire des
--    org ids, incompatibles avec elle.
do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  where con.conrelid = 'public.users'::regclass and con.contype = 'f'
    and con.conkey = array[(select attnum from pg_attribute
      where attrelid = 'public.users'::regclass and attname = 'client_org_id')];
  if cname is not null then execute format('alter table public.users drop constraint %I', cname); end if;
end $$;

-- 2) Comply : la valeur est un cabinet_clients.id → la remplacer par son org.
update public.users u
set client_org_id = cc.client_org_id
from public.cabinet_clients cc
where u.role = 'client' and u.client_org_id = cc.id and cc.client_org_id is not null;

-- 3) Regul / restants (client_org_id NULL) : via le contact portail (déjà unifié P2.1).
update public.users u
set client_org_id = (
  select cpc.client_org_id from public.client_portal_contacts cpc
  where cpc.user_id = u.id and cpc.client_org_id is not null limit 1
)
where u.role = 'client' and u.client_org_id is null;

-- 4) Ajouter la nouvelle FK → organizations.
alter table public.users
  add constraint users_client_org_id_fkey
  foreign key (client_org_id) references public.organizations(id) on delete set null;

-- ── Part B : cpc.client_org_id NOT NULL (backfill P2.1 déjà complet) ─────────────
alter table public.client_portal_contacts alter column client_org_id set not null;

-- ── Part C : réécriture des policies sur client_org_id ──────────────────────────
-- Staff cabinet : voit/gère les contacts des orgs clientes de son cabinet.
drop policy if exists "cpc_select_cabinet" on public.client_portal_contacts;
create policy "cpc_select_cabinet" on public.client_portal_contacts for select to authenticated
  using (client_org_id in (select public.get_my_client_org_ids()));
drop policy if exists "cpc_insert_cabinet" on public.client_portal_contacts;
create policy "cpc_insert_cabinet" on public.client_portal_contacts for insert to authenticated
  with check (client_org_id in (select public.get_my_client_org_ids()));
drop policy if exists "cpc_update_cabinet" on public.client_portal_contacts;
create policy "cpc_update_cabinet" on public.client_portal_contacts for update to authenticated
  using (client_org_id in (select public.get_my_client_org_ids()));
drop policy if exists "cpc_delete_cabinet" on public.client_portal_contacts;
create policy "cpc_delete_cabinet" on public.client_portal_contacts for delete to authenticated
  using (client_org_id in (select public.get_my_client_org_ids()));

-- Client portail : voit les contacts de SA propre org auditée (une seule branche).
drop policy if exists "cpc_select_own_org" on public.client_portal_contacts;
create policy "cpc_select_own_org" on public.client_portal_contacts for select to authenticated
  using (
    client_org_id = (
      select u.client_org_id from public.users u
      where u.auth_id = auth.uid() and u.role = 'client' limit 1
    )
  );

-- Staff régulateur : contacts de ses assujettis (sous-arbre) — via client_org_id.
drop policy if exists "cpc_select_regulator_subtree" on public.client_portal_contacts;
create policy "cpc_select_regulator_subtree" on public.client_portal_contacts for select to authenticated
  using (client_org_id in (select public.get_subsidiary_ids(public.get_my_organization_id())));

-- ── Part D : dépendances hors cpc reposant sur users.client_org_id ──────────────
-- Historique d'audit côté client : cabinet_client_id (fiche) → via son org.
drop policy if exists "cp_audit_history_select" on public.audit_history;
create policy "cp_audit_history_select" on public.audit_history for select to authenticated
  using (
    public.is_client_role()
    and cabinet_client_id in (
      select cc.id from public.cabinet_clients cc
      where cc.client_org_id = (
        select u.client_org_id from public.users u
        where u.id = public.get_my_user_id() and u.role = 'client'
      )
    )
  );

-- Visibilité org côté portail (branding « audité par X » + sa propre org) — via client_org_id.
create or replace function public.get_my_client_visible_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cc.cabinet_id
  from public.cabinet_clients cc
  join public.client_portal_contacts cpc on cpc.client_org_id = cc.client_org_id
  where cpc.user_id = public.get_my_user_id()
  union
  select cpc.client_org_id
  from public.client_portal_contacts cpc
  where cpc.user_id = public.get_my_user_id();
$$;
