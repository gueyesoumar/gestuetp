-- 00139 — Gëstu Regul (M4) : mesures graduées du régulateur.
--
-- Transforme les constats d'audit en actes de régulation, avec l'échelle
-- graduée recommandation -> mise en demeure -> injonction -> sanction.
-- Chaque acte est ancré dans le journal probant (S1) par l'Edge Function
-- issue-measure. Additive et NEUTRE côté Comply (table inutilisée en comply).

create table if not exists public.regulatory_measures (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  finding_ids uuid[] not null default '{}',
  measure_type text not null check (measure_type in ('recommandation', 'mise_en_demeure', 'injonction', 'sanction')),
  status text not null default 'draft' check (status in ('draft', 'issued', 'acknowledged', 'resolved', 'appealed', 'closed')),
  title text not null,
  legal_basis text,
  body text,
  deadline date,
  reference text,
  parent_measure_id uuid references public.regulatory_measures(id) on delete set null,
  issued_at timestamptz,
  issued_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.regulatory_measures is
  'Gëstu Regul (M4) : actes gradués du régulateur (reco/mise en demeure/injonction/sanction), ancrés dans probative_log. Vide côté Comply.';

create index if not exists idx_rm_entity on public.regulatory_measures(entity_id);
create index if not exists idx_rm_mission on public.regulatory_measures(mission_id);
create index if not exists idx_rm_parent on public.regulatory_measures(parent_measure_id);

create trigger trg_rm_updated_at
  before update on public.regulatory_measures
  for each row execute function public.set_updated_at();

alter table public.regulatory_measures enable row level security;

-- Lecture : staff régulateur (jamais un rôle client) dont l'assujetti est dans
-- le sous-arbre. Réutilise get_subsidiary_ids (récursif) + garde de rôle.
create policy "rm_select_regulator"
  on public.regulatory_measures for select
  to authenticated
  using (
    not public.is_client_role()
    and entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
  );

-- Écriture réservée au service_role (Edge Function issue-measure) : aucune
-- policy insert/update/delete pour authenticated -> tout passe par le backend,
-- qui ancre chaque acte dans le journal probant.
