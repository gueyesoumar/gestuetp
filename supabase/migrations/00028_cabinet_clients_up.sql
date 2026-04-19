-- Migration: Fiche client gérée par le cabinet (UP)

create table public.cabinet_clients (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.organizations(id) on delete cascade,
  client_org_id uuid not null references public.organizations(id) on delete cascade,
  effectifs text,
  chiffre_affaires text,
  nombre_sites integer,
  activites_principales text,
  structure_hierarchique text,
  parties_interessees jsonb not null default '[]',
  exigences_reglementaires jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cabinet_id, client_org_id)
);

comment on table public.cabinet_clients is 'Fiche client gérée par un cabinet — informations métier internes au cabinet';
comment on column public.cabinet_clients.effectifs is 'Ex: Moins de 50, 50-250, 250-1000, 1000-5000, Plus de 5000';
comment on column public.cabinet_clients.chiffre_affaires is 'Tranche de CA ou montant';
comment on column public.cabinet_clients.parties_interessees is 'Ex: [{"nom": "CNIL", "type": "regulateur", "attentes": "Conformité RGPD"}]';
comment on column public.cabinet_clients.exigences_reglementaires is 'Ex: [{"nom": "RGPD", "type": "legale", "description": "Protection des données personnelles", "impact": "Fort"}]';

-- Index
create index idx_cabinet_clients_cabinet on public.cabinet_clients(cabinet_id);
create index idx_cabinet_clients_client on public.cabinet_clients(client_org_id);

-- Trigger updated_at
create trigger trg_cabinet_clients_updated_at
  before update on public.cabinet_clients
  for each row execute function public.set_updated_at();

-- RLS
alter table public.cabinet_clients enable row level security;

-- Les membres du cabinet peuvent voir les fiches clients de leur cabinet
create policy "cabinet_clients_select_cabinet"
  on public.cabinet_clients for select
  to authenticated
  using (cabinet_id = public.get_my_organization_id());

-- Les membres du cabinet peuvent modifier les fiches
create policy "cabinet_clients_update_cabinet"
  on public.cabinet_clients for update
  to authenticated
  using (cabinet_id = public.get_my_organization_id())
  with check (cabinet_id = public.get_my_organization_id());

-- Les membres du cabinet peuvent créer des fiches
create policy "cabinet_clients_insert_cabinet"
  on public.cabinet_clients for insert
  to authenticated
  with check (cabinet_id = public.get_my_organization_id());

-- Les membres du cabinet peuvent supprimer des fiches
create policy "cabinet_clients_delete_cabinet"
  on public.cabinet_clients for delete
  to authenticated
  using (cabinet_id = public.get_my_organization_id());
