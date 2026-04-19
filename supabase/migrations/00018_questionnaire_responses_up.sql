-- Migration: questionnaire_responses (UP)
-- Description: Reponses du client aux questions du questionnaire

create table public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.questionnaire_instances(id) on delete cascade,
  question_code text not null,
  response jsonb,
  responded_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id, question_code)
);

comment on table public.questionnaire_responses is 'Reponses du client aux questions';
comment on column public.questionnaire_responses.question_code is 'Code de la question dans le snapshot';
comment on column public.questionnaire_responses.response is 'Reponse structuree (texte, choix, boolean...)';

-- Index
create index idx_qr_instance on public.questionnaire_responses(instance_id);
create index idx_qr_responded_by on public.questionnaire_responses(responded_by);

-- Trigger updated_at
create trigger trg_questionnaire_responses_updated_at
  before update on public.questionnaire_responses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.questionnaire_responses enable row level security;

-- Le client peut voir et modifier ses reponses
create policy "qr_select_client"
  on public.questionnaire_responses for select
  to authenticated
  using (
    responded_by in (select id from public.users where auth_id = auth.uid())
    or exists (
      select 1 from public.questionnaire_instances qi
      join public.missions m on m.id = qi.mission_id
      join public.users u on u.organization_id = m.client_id
      where qi.id = questionnaire_responses.instance_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

create policy "qr_insert_client"
  on public.questionnaire_responses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.questionnaire_instances qi
      join public.missions m on m.id = qi.mission_id
      join public.users u on u.organization_id = m.client_id
      where qi.id = questionnaire_responses.instance_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );

create policy "qr_update_client"
  on public.questionnaire_responses for update
  to authenticated
  using (
    responded_by in (select id from public.users where auth_id = auth.uid())
  )
  with check (
    responded_by in (select id from public.users where auth_id = auth.uid())
  );

-- L'equipe mission peut voir les reponses
create policy "qr_select_team"
  on public.questionnaire_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.questionnaire_instances qi
      join public.mission_members mm on mm.mission_id = qi.mission_id
      join public.users u on u.id = mm.user_id
      where qi.id = questionnaire_responses.instance_id
        and u.auth_id = auth.uid()
    )
  );
