-- Migration: questions (DOWN)

drop trigger if exists trg_questions_updated_at on public.questions;
drop policy if exists "questions_select_authenticated" on public.questions;
drop table if exists public.questions cascade;
