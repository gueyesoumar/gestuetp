-- Rollback 00314.
drop trigger if exists trg_risk_review_after_insert on public.risk_reviews;
drop function if exists public.risk_review_after_insert() cascade;
drop policy if exists "rr_aal2" on public.risk_reviews;
drop policy if exists "rr_org" on public.risk_reviews;
drop table if exists public.risk_reviews;
drop index if exists public.idx_risk_scenarios_next_review;
alter table public.risk_scenarios
  drop column if exists review_frequency_months,
  drop column if exists last_reviewed_at,
  drop column if exists next_review_at;
