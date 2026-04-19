-- Migration: questionnaire_responses (DOWN)

drop trigger if exists trg_questionnaire_responses_updated_at on public.questionnaire_responses;
drop policy if exists "qr_select_client" on public.questionnaire_responses;
drop policy if exists "qr_insert_client" on public.questionnaire_responses;
drop policy if exists "qr_update_client" on public.questionnaire_responses;
drop policy if exists "qr_select_team" on public.questionnaire_responses;
drop table if exists public.questionnaire_responses cascade;
