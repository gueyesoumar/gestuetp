-- Rollback 00315.
drop trigger if exists trg_activity_risk_criteria on public.risk_criteria;
drop trigger if exists trg_activity_risk_reviews on public.risk_reviews;
drop trigger if exists trg_activity_risk_acceptances on public.risk_acceptances;
drop trigger if exists trg_activity_risk_treatment_actions on public.risk_treatment_actions;
drop trigger if exists trg_activity_risk_scenarios on public.risk_scenarios;
