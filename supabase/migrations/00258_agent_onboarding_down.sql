-- 00258 (DOWN) — RFC 0011 : retrait assistant d'onboarding.
-- Les policies et triggers tombent avec les tables.

drop table if exists public.onboarding_tours_seen;
drop table if exists public.onboarding_conversations;
delete from public.feature_flags where slug = 'support_agent_onboarding';
