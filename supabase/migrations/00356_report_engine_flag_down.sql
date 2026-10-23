-- Migration: 00356_report_engine_flag_down
-- Rollback : retire le flag (CASCADE supprime ses overrides et le trigger
-- recompute retire l'entitlement feature.report_engine_v2).

delete from public.feature_flags where slug = 'report_engine_v2';
