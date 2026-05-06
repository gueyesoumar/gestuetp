-- Migration: questionnaire_collab (DOWN)

-- 5. Drop policies team UPDATE/INSERT sur questionnaire_responses
drop policy if exists "qr_update_team" on public.questionnaire_responses;
drop policy if exists "qr_insert_team" on public.questionnaire_responses;

-- 4. entered_by_auditor flag
alter table public.questionnaire_responses drop column if exists entered_by_auditor;

-- 1-3. Drop comments table + trigger + function
drop trigger if exists trg_qr_comments_prevent_resurrection on public.questionnaire_response_comments;
drop trigger if exists trg_qr_comments_updated_at on public.questionnaire_response_comments;
drop function if exists public.prevent_qr_comment_resurrection();
drop policy if exists "qrc_update_own" on public.questionnaire_response_comments;
drop policy if exists "qrc_insert_client" on public.questionnaire_response_comments;
drop policy if exists "qrc_insert_team" on public.questionnaire_response_comments;
drop policy if exists "qrc_select_client" on public.questionnaire_response_comments;
drop policy if exists "qrc_select_team" on public.questionnaire_response_comments;
drop table if exists public.questionnaire_response_comments;
