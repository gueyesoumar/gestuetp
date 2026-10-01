-- 00261 — Rollback : retrait des colonnes de score d'exposition IA.

alter table public.documents
  drop column if exists ai_sensitivity,
  drop column if exists ai_pii_count,
  drop column if exists ai_financial_count,
  drop column if exists ai_secret_count,
  drop column if exists ai_exposure_at;

alter table public.ai_calls_log
  drop column if exists exposure_score,
  drop column if exists exposure_level,
  drop column if exists exposure_pii,
  drop column if exists exposure_financial,
  drop column if exists exposure_secret;
