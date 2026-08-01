-- Migration: audit_topics (DOWN)
-- Rollback de 00112_audit_topics_up.sql

drop policy if exists "topic_controls_delete" on public.topic_controls;
drop policy if exists "topic_controls_insert" on public.topic_controls;
drop policy if exists "topic_controls_select" on public.topic_controls;
drop table if exists public.topic_controls;

drop policy if exists "audit_topics_delete" on public.audit_topics;
drop policy if exists "audit_topics_update" on public.audit_topics;
drop policy if exists "audit_topics_insert" on public.audit_topics;
drop policy if exists "audit_topics_select" on public.audit_topics;
drop trigger if exists trg_audit_topics_updated_at on public.audit_topics;
drop index if exists idx_audit_topics_mission;
drop index if exists idx_audit_topics_framework;
drop index if exists idx_audit_topics_mission_name;
drop index if exists idx_audit_topics_framework_name;
drop table if exists public.audit_topics;
