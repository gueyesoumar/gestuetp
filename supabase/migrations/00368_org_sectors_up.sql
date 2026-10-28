-- 00368 (UP) - Référentiel de secteurs paramétrable par organisation (RFC 0022, Lot 1).
--
-- La notion de secteur était figée dans deux constantes front (SECTEURS_OPTIONS,
-- PUBLIC_SECTORS) et stockée en texte libre sur organizations.sector. On introduit un
-- référentiel de SAISIE scopé par org, sur le patron risk_scenario_templates (00329) :
--   - owner_org_id = null  -> secteur PLATEFORME (seed des constantes, fallback).
--   - owner_org_id = <org> -> secteur PROPRE à une org (régulateur ou cabinet),
--     visible par SES assujettis via le RPC get_sectors (SECURITY DEFINER).
-- Option A (RFC 0022 §4) : la CLÉ de rapprochement reste le LIBELLÉ (organizations.sector,
-- risk_scenario_templates.sectors[], supervision_assignments.scope_sector inchangés).
-- org_sectors est un référentiel de gouvernance, PAS une contrainte d'intégrité (aucune FK
-- depuis organizations.sector en Phase A). Zéro migration de données.

create table if not exists public.org_sectors (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid references public.organizations(id) on delete cascade,
  label text not null,
  kind text not null default 'generic' check (kind in ('generic', 'public', 'private')),
  is_active boolean not null default true,
  sort_order int,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);

-- Unicité du libellé dans un périmètre (plateforme, ou une org donnée), insensible à la casse.
create unique index if not exists uq_org_sectors_scope_label
  on public.org_sectors (coalesce(owner_org_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(label));
create index if not exists idx_org_sectors_owner on public.org_sectors(owner_org_id);

alter table public.org_sectors enable row level security;

-- Lecture (staff) : secteurs plateforme + ceux de ma propre org. L'accès des assujettis au
-- référentiel de LEUR régulateur passe par le RPC SECURITY DEFINER get_sectors.
create policy "os_select" on public.org_sectors for select to authenticated
using (not public.is_client_role() and (owner_org_id is null or owner_org_id = public.get_my_organization_id()));

-- Écriture : secteurs de ma propre org, permission can_manage_sectors.
create policy "os_write" on public.org_sectors for all to authenticated
using (owner_org_id = public.get_my_organization_id() and not public.is_client_role()
       and public.has_cabinet_permission('can_manage_sectors'))
with check (owner_org_id = public.get_my_organization_id() and not public.is_client_role()
       and public.has_cabinet_permission('can_manage_sectors'));
create policy "os_aal2" on public.org_sectors as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

-- Seed : les constantes front deviennent les secteurs PLATEFORME (owner_org_id = null).
-- Les libellés présents dans les deux listes sont dédupliqués (le secteur public l'emporte).
insert into public.org_sectors (owner_org_id, label, kind, sort_order)
select null, d.label, d.kind, (row_number() over (order by lower(d.label)))::int
from (
  select distinct on (lower(s.label)) s.label, s.kind
  from (
    select unnest(array[
      'Administration publique', 'Fiscalité', 'Douanes', 'Trésor / Finances publiques', 'Justice',
      'Défense / Sécurité intérieure', 'Élections / État civil', 'Statistique nationale',
      'Collectivités territoriales', 'Infrastructure numérique de l''État', 'Énergie',
      'Eau / Assainissement', 'Télécommunications', 'Transport', 'Ports', 'Aéroports / Aviation civile',
      'Santé publique', 'Protection sociale', 'Éducation / Formation', 'Agriculture / Élevage / Pêche',
      'Environnement'
    ]) as label, 'public' as kind
    union all
    select unnest(array[
      'Administration publique', 'Agriculture', 'Assurance', 'Banque / Finance', 'BTP / Construction',
      'Commerce / Distribution', 'Conseil', 'Défense', 'Éducation / Formation', 'Énergie',
      'Hôtellerie / Restauration', 'Immobilier', 'Industrie / Fabrication', 'Logistique / Transport',
      'Médias / Communication', 'Mines / Extraction', 'ONG / Associations', 'Santé / Pharmaceutique',
      'Services aux entreprises', 'Télécommunications', 'Technologies / Informatique', 'Tourisme', 'Autre'
    ]) as label, 'private' as kind
  ) s
  order by lower(s.label), (case when s.kind = 'public' then 0 else 1 end)
) d
where not exists (
  select 1 from public.org_sectors o
  where o.owner_org_id is null and lower(o.label) = lower(d.label)
);

-- Permission can_manage_sectors : accordée aux rôles déjà gestionnaires (patron 00347).
-- Sans ce backfill, has_cabinet_permission('can_manage_sectors') = false pour tout non
-- platform-owner -> 403 à l'édition du référentiel.
update public.platform_roles
set permissions = permissions || jsonb_build_object(
  'can_manage_sectors',
  coalesce((permissions ->> 'can_manage_clients')::boolean, false)
  or coalesce((permissions ->> 'can_create_mission')::boolean, false)
  or coalesce((permissions ->> 'can_manage_members')::boolean, false)
)
where not (permissions ? 'can_manage_sectors');

-- RPC lecture : secteurs applicables à mon org = plateforme OU ma propre org OU mon(mes)
-- régulateur(s). Actifs par défaut ; p_include_inactive pour résoudre les libellés archivés
-- à l'affichage. get_my_supervisor_org_ids() défini en 00329.
create or replace function public.get_sectors(p_include_inactive boolean default false)
returns table (id uuid, owner_org_id uuid, label text, kind text, is_active boolean, sort_order int)
language sql stable security definer set search_path = '' as $$
  select s.id, s.owner_org_id, s.label, s.kind, s.is_active, s.sort_order
  from public.org_sectors s
  where not public.is_client_role()
    and (s.owner_org_id is null
         or s.owner_org_id = public.get_my_organization_id()
         or s.owner_org_id in (select public.get_my_supervisor_org_ids()))
    and (p_include_inactive or s.is_active)
  order by coalesce(s.sort_order, 2147483647), lower(s.label);
$$;
revoke all on function public.get_sectors(boolean) from public;
grant execute on function public.get_sectors(boolean) to authenticated;

do $$
declare v_seeded int; v_granted int;
begin
  select count(*) into v_seeded from public.org_sectors where owner_org_id is null;
  select count(*) into v_granted from public.platform_roles where (permissions ->> 'can_manage_sectors')::boolean;
  raise notice '[00368] org_sectors seed plateforme: % ; platform_roles avec can_manage_sectors=true: %', v_seeded, v_granted;
end $$;
