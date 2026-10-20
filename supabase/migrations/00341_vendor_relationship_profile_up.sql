-- 00341 - Gëstu Vendor (RFC 0020 Lot 1) : profil d'ARETE du fournisseur + lecture.
-- Split noeud/arete (RFC 0007 §8.1) : l'identite durable vit sur le noeud organisation ;
-- le CONTEXTE de la relation (services, acces, criticite relative, contrat, qualification)
-- vit ici, 1-1 sur l'arete 'supplier' (pattern engagement_profiles, mig 00215).

create table if not exists public.vendor_relationship_profile (
  relationship_id uuid primary key references public.organization_relationships(id) on delete cascade,
  services text,
  data_access_level text not null default 'aucun' check (data_access_level in ('aucun', 'limite', 'etendu', 'critique')),
  criticality text not null default 'standard' check (criticality in ('eleve', 'standard')),
  contract_start date,
  contract_end date,
  internal_ref text,
  qualification_status text not null default 'prospect'
    check (qualification_status in ('prospect', 'en_evaluation', 'qualifie', 'qualifie_conditions', 'non_qualifie', 'suspendu')),
  valid_until date,
  last_assessed_at date,
  next_assessment_at date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendor_relationship_profile enable row level security;

-- Lecture/ecriture : l'org GESTIONNAIRE (actor de l'arete 'supplier'). Pas de recursion
-- (organization_relationships ne reference pas cette table ; helpers SECURITY DEFINER).
create policy "vrp_select" on public.vendor_relationship_profile for select to authenticated
using (not public.is_client_role() and exists (
  select 1 from public.organization_relationships r
  where r.id = relationship_id and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()));

create policy "vrp_write" on public.vendor_relationship_profile for all to authenticated
using (not public.is_client_role() and public.has_cabinet_permission('can_manage_vendors') and exists (
  select 1 from public.organization_relationships r
  where r.id = relationship_id and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()))
with check (not public.is_client_role() and public.has_cabinet_permission('can_manage_vendors') and exists (
  select 1 from public.organization_relationships r
  where r.id = relationship_id and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()));

create policy "vrp_aal2" on public.vendor_relationship_profile as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

-- Lecture consolidee du registre des tiers de l'org courante (join noeud + profil).
create or replace function public.get_my_vendors()
returns table (
  relationship_id uuid, organization_id uuid, name text, sector text,
  services text, data_access_level text, criticality text,
  qualification_status text, valid_until date, next_assessment_at date)
language sql stable security definer set search_path = '' as $$
  select r.id, o.id, o.name, o.sector,
         p.services,
         coalesce(p.data_access_level, 'aucun'),
         coalesce(p.criticality, 'standard'),
         coalesce(p.qualification_status, 'prospect'),
         p.valid_until, p.next_assessment_at
  from public.organization_relationships r
  join public.organizations o on o.id = r.target_org_id
  left join public.vendor_relationship_profile p on p.relationship_id = r.id
  where r.actor_org_id = public.get_my_organization_id()
    and r.nature = 'supplier'
    and r.status = 'active'
    and not public.is_client_role()
  order by o.name;
$$;
revoke all on function public.get_my_vendors() from public;
grant execute on function public.get_my_vendors() to authenticated;
