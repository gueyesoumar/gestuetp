-- Rollback 00265
alter table public.documents
  drop column if exists ai_detected_categories;
