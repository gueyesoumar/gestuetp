-- 00319 - Gëstu Risk / RFC 0017 (G2) : causes & conséquences multiples du nœud papillon.
-- Passe de 1 menace / 1 conséquence (colonnes threat_ref / feared_event_ref, conservées
-- en repli) à N causes / N conséquences par scénario. Additif : les colonnes existantes
-- restent (fallback + RPC get_audited_org_risks / get_supervised_risks inchangés).

create table public.risk_scenario_nodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  node_type text not null check (node_type in ('cause','consequence')),
  label text not null,
  catalog_ref uuid references public.risk_catalog(id) on delete set null,
  position int not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.risk_scenario_nodes is
  'Causes (menaces) et conséquences multiples d''un scénario de risque (RFC 0017 G2, zones 1 et 5 du nœud papillon).';

create index idx_rsn_scenario on public.risk_scenario_nodes(risk_scenario_id);
create index idx_rsn_org on public.risk_scenario_nodes(organization_id);

-- RLS : org-scoped, personnel non-client (patron risk_treatment_actions 00311).
alter table public.risk_scenario_nodes enable row level security;

create policy "rsn_org" on public.risk_scenario_nodes for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());

create policy "rsn_aal2" on public.risk_scenario_nodes as restrictive for all to authenticated
  using (public.is_aal2());

-- Backfill : une node cause depuis threat_ref, une node conséquence depuis feared_event_ref
-- (libellé repris du catalogue) pour les scénarios existants.
insert into public.risk_scenario_nodes (organization_id, risk_scenario_id, node_type, label, catalog_ref)
select rs.organization_id, rs.id, 'cause', coalesce(c.label, 'Menace'), rs.threat_ref
from public.risk_scenarios rs
join public.risk_catalog c on c.id = rs.threat_ref
where rs.threat_ref is not null;

insert into public.risk_scenario_nodes (organization_id, risk_scenario_id, node_type, label, catalog_ref)
select rs.organization_id, rs.id, 'consequence', coalesce(c.label, 'Événement redouté'), rs.feared_event_ref
from public.risk_scenarios rs
join public.risk_catalog c on c.id = rs.feared_event_ref
where rs.feared_event_ref is not null;
