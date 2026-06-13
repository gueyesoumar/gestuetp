-- 00131 — Rollback : retire le flag et la table agent_runs.

delete from public.feature_flags where slug = 'support_agent_triage';

drop table if exists public.agent_runs;
