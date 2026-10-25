-- Migration: 00358_report_template_texts_up
-- Description: Textes editables par template (RFC 0021 B1). Surcharge des libelles
--   fixes du rapport (titres/chapeaux de section + mentions globales) par cle plate
--   conventionnee. La prose data-driven reste generee. Defaut = texte integre.

alter table public.report_templates
  add column if not exists texts jsonb not null default '{}'::jsonb;
