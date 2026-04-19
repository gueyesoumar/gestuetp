-- Migration: questions (UP)
-- Description: Questions d'un template de questionnaire

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.questionnaire_templates(id) on delete cascade,
  code text not null,
  text text not null,
  description text,
  question_type text not null default 'text',
  options jsonb,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, code)
);

comment on table public.questions is 'Questions d''un template de questionnaire';
comment on column public.questions.question_type is 'text, textarea, single_choice, multiple_choice, boolean, file_upload';
comment on column public.questions.options is 'Options pour single_choice/multiple_choice. Ex: ["Oui","Non","Partiel"]';

-- Index
create index idx_questions_template on public.questions(template_id);

-- Trigger updated_at
create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.questions enable row level security;

create policy "questions_select_authenticated"
  on public.questions for select
  to authenticated
  using (
    exists (
      select 1 from public.questionnaire_templates qt
      where qt.id = questions.template_id
        and qt.is_active = true
    )
  );

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)
