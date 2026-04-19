-- Migration: controls (UP)
-- Description: Controles d'un domaine (ex: A.5.1.1 Politiques de securite de l'information)

create table public.controls (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  guidance text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(domain_id, code)
);

comment on table public.controls is 'Controles d''un domaine de referentiel';
comment on column public.controls.code is 'Ex: A.5.1.1, BAI01.01...';
comment on column public.controls.guidance is 'Guide de mise en oeuvre du controle';

-- Index
create index idx_controls_domain on public.controls(domain_id);

-- Trigger updated_at
create trigger trg_controls_updated_at
  before update on public.controls
  for each row execute function public.set_updated_at();

-- RLS
alter table public.controls enable row level security;

create policy "controls_select_authenticated"
  on public.controls for select
  to authenticated
  using (
    exists (
      select 1 from public.domains d
      join public.frameworks f on f.id = d.framework_id
      where d.id = controls.domain_id
        and f.is_active = true
    )
  );

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)
