-- Migration: 00358_report_template_texts_down
alter table public.report_templates drop column if exists texts;
