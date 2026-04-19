-- Migration: domains (UP)
-- Description: Domaines d'un referentiel (ex: A.5 Politiques de securite pour ISO 27001)

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.frameworks(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(framework_id, code)
);

comment on table public.domains is 'Domaines d''un referentiel';
comment on column public.domains.code is 'Ex: A.5, A.6, BAI01...';
comment on column public.domains.sort_order is 'Ordre d''affichage dans le referentiel';

-- Index
create index idx_domains_framework on public.domains(framework_id);

-- Trigger updated_at
create trigger trg_domains_updated_at
  before update on public.domains
  for each row execute function public.set_updated_at();

-- RLS
alter table public.domains enable row level security;

create policy "domains_select_authenticated"
  on public.domains for select
  to authenticated
  using (
    exists (
      select 1 from public.frameworks f
      where f.id = domains.framework_id
        and f.is_active = true
    )
  );

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)
