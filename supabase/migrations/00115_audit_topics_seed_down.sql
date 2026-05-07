-- Migration: audit_topics_seed (DOWN)
-- Rollback de 00115_audit_topics_seed_up.sql

delete from public.topic_controls where topic_id in (
  select id from public.audit_topics where framework_id in (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000017'
  )
);
delete from public.audit_topics where framework_id in (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000017'
);
