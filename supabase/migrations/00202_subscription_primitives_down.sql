-- Migration 00202 (DOWN) : rollback primitives d'abonnement (RFC 0006, P4a)

drop function if exists public.org_subscription_state(uuid);
drop function if exists public.platform_mrr();
drop function if exists public.org_mrr(uuid);
