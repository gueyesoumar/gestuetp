-- 00187 — rollback : promotion constat → registre Gëstu Risk

drop function if exists public.promote_finding(uuid, public.score_dimension, int, int, text, uuid, uuid);

alter table public.assessment_findings
  drop column if exists promoted_at;

alter table public.risk_scenarios
  drop column if exists source_finding_id;
