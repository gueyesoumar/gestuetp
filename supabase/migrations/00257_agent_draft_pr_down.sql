-- 00257 (DOWN) — Phase 5b : retrait suivi PR + flag draft_pr.

delete from public.feature_flags where slug = 'support_agent_draft_pr';
alter table public.agent_runs
  drop column if exists pr_url,
  drop column if exists pr_branch,
  drop column if exists pr_state;
