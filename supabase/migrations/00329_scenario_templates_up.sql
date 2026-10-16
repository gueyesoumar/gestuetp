-- 00329 - Gëstu Risk : modèles de scénarios (catalogue plateforme + catalogue par org).
--
-- Un modèle = scénario pré-rempli (intitulé, dimension, cotation suggérée, causes/
-- conséquences), étiqueté par SECTEUR(S). Deux niveaux :
--   - owner_org_id = null  -> catalogue PLATEFORME (générique, seedé, lecture seule).
--   - owner_org_id = <org> -> catalogue PROPRE à une org (ex. le régulateur édite ses
--     modèles par secteur, visibles par SES assujettis). Patron biblio org RFC 0016.
-- Multi-secteurs : sectors text[] ; tableau VIDE = applicable à tous les secteurs.

create table if not exists public.risk_scenario_templates (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid references public.organizations(id) on delete cascade,
  sectors text[] not null default '{}',
  title text not null,
  dimension public.score_dimension,
  suggested_likelihood int not null default 2 check (suggested_likelihood between 1 and 4),
  suggested_impact int not null default 2 check (suggested_impact between 1 and 4),
  threat_ref uuid references public.risk_catalog(id) on delete set null,
  feared_event_ref uuid references public.risk_catalog(id) on delete set null,
  vulnerability text,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rst_owner on public.risk_scenario_templates(owner_org_id);
create index if not exists idx_rst_sectors on public.risk_scenario_templates using gin (sectors);

create table if not exists public.risk_scenario_template_nodes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.risk_scenario_templates(id) on delete cascade,
  node_type text not null check (node_type in ('cause', 'consequence')),
  label text not null,
  catalog_ref uuid references public.risk_catalog(id) on delete set null,
  position int not null default 0
);
create index if not exists idx_rstn_template on public.risk_scenario_template_nodes(template_id);

alter table public.risk_scenario_templates enable row level security;
alter table public.risk_scenario_template_nodes enable row level security;

-- Lecture (staff) : catalogue plateforme + modèles de ma propre org. L'accès des
-- assujettis aux modèles de LEUR régulateur passe par le RPC SECURITY DEFINER.
create policy "rst_select" on public.risk_scenario_templates for select to authenticated
using (not public.is_client_role() and (owner_org_id is null or owner_org_id = public.get_my_organization_id()));

-- Écriture : modèles de ma propre org, permission can_manage_risk_criteria.
create policy "rst_write" on public.risk_scenario_templates for all to authenticated
using (owner_org_id = public.get_my_organization_id() and not public.is_client_role()
       and public.has_cabinet_permission('can_manage_risk_criteria'))
with check (owner_org_id = public.get_my_organization_id() and not public.is_client_role()
       and public.has_cabinet_permission('can_manage_risk_criteria'));
create policy "rst_aal2" on public.risk_scenario_templates as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

-- Nodes : suivent la visibilité / propriété du modèle parent.
create policy "rstn_select" on public.risk_scenario_template_nodes for select to authenticated
using (exists (select 1 from public.risk_scenario_templates t where t.id = template_id
  and not public.is_client_role() and (t.owner_org_id is null or t.owner_org_id = public.get_my_organization_id())));
create policy "rstn_write" on public.risk_scenario_template_nodes for all to authenticated
using (exists (select 1 from public.risk_scenario_templates t where t.id = template_id
  and t.owner_org_id = public.get_my_organization_id() and not public.is_client_role()
  and public.has_cabinet_permission('can_manage_risk_criteria')))
with check (exists (select 1 from public.risk_scenario_templates t where t.id = template_id
  and t.owner_org_id = public.get_my_organization_id() and not public.is_client_role()
  and public.has_cabinet_permission('can_manage_risk_criteria')));
create policy "rstn_aal2" on public.risk_scenario_template_nodes as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

-- Helper : les org(s) qui ME supervisent (sens inverse de regulatory_supervision).
create or replace function public.get_my_supervisor_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select r.actor_org_id
  from public.organization_relationships r
  where r.target_org_id = public.get_my_organization_id()
    and r.nature = 'regulatory_supervision'
    and r.status = 'active';
$$;
revoke all on function public.get_my_supervisor_org_ids() from public;
grant execute on function public.get_my_supervisor_org_ids() to authenticated;

-- RPC sélecteur (création de scénario) : modèles applicables à mon org =
-- plateforme OU mon régulateur OU ma propre org, filtrés par mon secteur.
create or replace function public.get_scenario_templates()
returns table (
  id uuid, owner_org_id uuid, sectors text[], title text, dimension text,
  suggested_likelihood int, suggested_impact int,
  threat_ref uuid, feared_event_ref uuid, vulnerability text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select public.get_my_organization_id() as org,
           (select o.sector from public.organizations o where o.id = public.get_my_organization_id()) as sector
  )
  select t.id, t.owner_org_id, t.sectors, t.title, t.dimension::text,
         t.suggested_likelihood, t.suggested_impact, t.threat_ref, t.feared_event_ref, t.vulnerability
  from public.risk_scenario_templates t, me
  where t.is_active
    and not public.is_client_role()
    and (t.owner_org_id is null
         or t.owner_org_id = me.org
         or t.owner_org_id in (select public.get_my_supervisor_org_ids()))
    and (cardinality(t.sectors) = 0 or me.sector = any (t.sectors))
  order by t.title;
$$;
revoke all on function public.get_scenario_templates() from public;
grant execute on function public.get_scenario_templates() to authenticated;

-- RPC nodes d'un modèle (pour l'instanciation), même autorisation de visibilité.
create or replace function public.get_scenario_template_nodes(p_template uuid)
returns table (node_type text, label text, position int)
language sql stable security definer set search_path = '' as $$
  select n.node_type, n.label, n.position
  from public.risk_scenario_template_nodes n
  join public.risk_scenario_templates t on t.id = n.template_id
  where n.template_id = p_template
    and not public.is_client_role()
    and (t.owner_org_id is null
         or t.owner_org_id = public.get_my_organization_id()
         or t.owner_org_id in (select public.get_my_supervisor_org_ids()))
  order by n.node_type, n.position;
$$;
revoke all on function public.get_scenario_template_nodes(uuid) from public;
grant execute on function public.get_scenario_template_nodes(uuid) to authenticated;
