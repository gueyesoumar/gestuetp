-- Migration 00199 (DOWN) : rollback couche ② abonnement (RFC 0006, Phase 2)
--
-- Sans risque : les tables sont DORMANTES en P2 (aucun lecteur runtime avant P3).

drop policy if exists "osf_aal2" on public.org_subscription_features;
drop policy if exists "osf_org"  on public.org_subscription_features;
drop policy if exists "os_aal2"  on public.org_subscriptions;
drop policy if exists "os_org"   on public.org_subscriptions;

alter table public.organizations
  drop column if exists home_product,
  drop column if exists discount_pct;

drop table if exists public.org_subscription_features;
drop table if exists public.org_subscriptions;

drop type if exists public.subscription_status;
