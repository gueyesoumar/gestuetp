-- Migration: questionnaire_templates (UP)
-- Description: Templates de questionnaires lies a un referentiel

create table public.questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.frameworks(id) on delete cascade,
  name text not null,
  description text,
  version text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.questionnaire_templates is 'Templates de questionnaires de prise de connaissance, lies a un referentiel';

-- Index
create index idx_questionnaire_templates_framework on public.questionnaire_templates(framework_id);

-- Trigger updated_at
create trigger trg_questionnaire_templates_updated_at
  before update on public.questionnaire_templates
  for each row execute function public.set_updated_at();

-- RLS
alter table public.questionnaire_templates enable row level security;

create policy "questionnaire_templates_select_authenticated"
  on public.questionnaire_templates for select
  to authenticated
  using (is_active = true);

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)
