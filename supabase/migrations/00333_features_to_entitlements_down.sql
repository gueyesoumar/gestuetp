-- 00333 (DOWN) - retrait du rapatriement des fonctionnalités.
drop function if exists public.my_features();
drop trigger if exists org_plan_recompute on public.organizations;
drop function if exists public.trg_org_plan_recompute();
drop trigger if exists ff_global_recompute on public.feature_flags;
drop function if exists public.trg_ff_global_recompute();
drop trigger if exists plan_feature_recompute on public.plan_features;
drop function if exists public.trg_plan_feature_recompute();
drop trigger if exists ff_override_recompute on public.feature_flag_overrides;
drop function if exists public.trg_ff_override_recompute();
-- Retire les entitlements de fonctionnalités projetés (préserve les octrois manuels).
delete from public.org_entitlements where key like 'feature.%' and source in ('bridge', 'backfill');
drop function if exists public.recompute_feature_entitlement(uuid, uuid);
