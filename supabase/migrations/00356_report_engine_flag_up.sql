-- Migration: 00356_report_engine_flag_up
-- Description: Feature flag du moteur de rapport v2 (react-pdf, RFC 0021 Lot 1).
--   OFF globalement : le rapport reste gere par le moteur jsPDF existant. On active
--   par ORG via feature_flag_overrides (le trigger recompute l'entitlement
--   feature.report_engine_v2 lu par useFeatureFlag('report_engine_v2')).

insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'report_engine_v2',
  'Moteur de rapport v2 (react-pdf)',
  'Genere le rapport d''audit avec le moteur react-pdf (mise en page automatique, rendu cote client) au lieu du moteur jsPDF. RFC 0021.',
  false
)
on conflict (slug) do nothing;
