-- 00275 — Modèle mutualisé de preuves (Lot C).
-- Une preuve attendue peut couvrir plusieurs contrôles : on introduit une table
-- canonique `evidence_items` (le document attendu distinct) et on rattache les
-- liens par contrôle (`evidence_catalog`), les documents et les constats à cette
-- preuve canonique. Non destructif : `evidence_catalog` et ses consommateurs
-- continuent de fonctionner (une ligne par contrôle), la mutualisation étant
-- portée par `evidence_item_id` partagé entre plusieurs lignes.

-- 1. Table canonique des preuves attendues (réutilisables sur N contrôles).
create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid references public.frameworks(id) on delete cascade,
  name text not null,
  description text,
  kind text not null default 'document' check (kind in ('document', 'policy', 'record', 'config')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.evidence_items is 'Preuves attendues canoniques, réutilisables sur plusieurs contrôles (mutualisation).';
comment on column public.evidence_items.kind is 'document | policy | record | config (aligné sur evidence_catalog.kind).';

create index idx_evidence_items_framework on public.evidence_items(framework_id);

create trigger trg_evidence_items_updated_at
  before update on public.evidence_items
  for each row execute function public.set_updated_at();

alter table public.evidence_items enable row level security;

-- Lecture pour tout utilisateur authentifié (référentiel partagé) ; écritures réservées
-- au service_role (admin Gëstu), comme evidence_catalog.
create policy "evidence_items_select_authenticated"
  on public.evidence_items for select
  to authenticated
  using (true);

-- 2. Liaisons vers la preuve canonique (non destructif).
alter table public.evidence_catalog
  add column if not exists evidence_item_id uuid references public.evidence_items(id) on delete set null;
create index if not exists idx_evidence_catalog_item on public.evidence_catalog(evidence_item_id);
comment on column public.evidence_catalog.evidence_item_id is 'Preuve canonique mutualisée ; plusieurs contrôles partageant cet id = même document attendu.';

alter table public.documents
  add column if not exists evidence_item_id uuid references public.evidence_items(id) on delete set null;
create index if not exists idx_documents_evidence_item on public.documents(evidence_item_id);
comment on column public.documents.evidence_item_id is 'Preuve canonique à laquelle ce document répond (couvre tous les contrôles liés).';

alter table public.assessment_findings
  add column if not exists evidence_item_id uuid references public.evidence_items(id) on delete set null;
create index if not exists idx_assessment_findings_evidence_item on public.assessment_findings(evidence_item_id);
comment on column public.assessment_findings.evidence_item_id is 'Constat rattaché à une preuve ; support de propagation vers les contrôles partageant la preuve.';
