-- Migration: questionnaire_quickwins (DOWN)

alter table public.questions drop constraint if exists questions_prefill_source_check;
alter table public.questions drop column if exists prefill_source;

alter table public.questionnaire_responses drop column if exists is_prefilled;
alter table public.questionnaire_responses drop constraint if exists questionnaire_responses_skip_reason_check;
alter table public.questionnaire_responses drop column if exists skip_reason;

drop index if exists public.idx_questionnaire_instances_due_date;
alter table public.questionnaire_instances drop column if exists due_date;
