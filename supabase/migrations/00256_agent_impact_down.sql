-- 00256 (DOWN) — Phase 5a : retrait chaînage + flag impact.

delete from public.feature_flags where slug = 'support_agent_impact';
drop index if exists public.agent_runs_parent_idx;
alter table public.agent_runs drop column if exists parent_run_id;
