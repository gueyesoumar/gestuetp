-- Migration: Table de correspondance entre controles de differents referentiels (UP)

create table public.control_mappings (
  id uuid primary key default gen_random_uuid(),
  source_control_id uuid not null references public.controls(id) on delete cascade,
  target_control_id uuid not null references public.controls(id) on delete cascade,
  relationship text not null default 'equivalent',
  notes text,
  created_at timestamptz not null default now(),
  unique(source_control_id, target_control_id)
);

comment on table public.control_mappings is 'Correspondances entre controles de referentiels differents';
comment on column public.control_mappings.relationship is 'equivalent, partial, related';

-- Index
create index idx_control_mappings_source on public.control_mappings(source_control_id);
create index idx_control_mappings_target on public.control_mappings(target_control_id);

-- RLS
alter table public.control_mappings enable row level security;

create policy "control_mappings_select_authenticated"
  on public.control_mappings for select
  to authenticated
  using (true);

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)
