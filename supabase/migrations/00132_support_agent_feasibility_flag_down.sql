-- Rollback 00132 : retire le flag de faisabilite.
delete from public.feature_flags where slug = 'support_agent_feasibility';
