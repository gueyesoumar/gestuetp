-- Migration: question_controls (UP)
-- Description: Lien many-to-many entre les questions du questionnaire de cadrage et les controles
-- d'un referentiel. Permet d'alimenter en phase 4 la carte "Reponses cadrage liees" sur le
-- workspace controle, et l'auto-creation de mission_evidence_requests au lancement du
-- questionnaire de cadrage. Voir HANDOFF_PORTAGE.md, refactor A.

-- 1. Table de liaison question <-> controle (many-to-many)

create table public.question_controls (
  question_id uuid not null references public.questions(id) on delete cascade,
  control_id  uuid not null references public.controls(id) on delete cascade,
  weight      smallint not null default 1,
  primary key (question_id, control_id)
);

comment on table public.question_controls is
  'Lien many-to-many entre questions du questionnaire de cadrage et controles d''un referentiel.';
comment on column public.question_controls.weight is
  '1=contexte, 2=partiel, 3=preuve forte. Sert a hierarchiser la pertinence d''une reponse pour l''evaluation du controle.';

create index idx_question_controls_question on public.question_controls(question_id);
create index idx_question_controls_control  on public.question_controls(control_id);

-- RLS
alter table public.question_controls enable row level security;

create policy "question_controls_select_authenticated"
  on public.question_controls for select
  to authenticated
  using (true);

-- INSERT/UPDATE/DELETE reserves au service_role (admin Gestu)

-- 2. Lien optionnel question -> preuve attendue (evidence_catalog)
-- Si non null, la question expose une zone d'upload inline cote client (Phase 2) et l'upload
-- cree automatiquement un mission_evidence_request rattache a cette preuve.

alter table public.questions
  add column evidence_catalog_id uuid references public.evidence_catalog(id) on delete set null;

comment on column public.questions.evidence_catalog_id is
  'Si non null, la question expose une zone d''upload inline rattachee a cette preuve attendue. L''upload cree un mission_evidence_request automatiquement.';

create index idx_questions_evidence_catalog on public.questions(evidence_catalog_id);
