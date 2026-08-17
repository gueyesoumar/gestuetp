-- 00190 — rollback : modèle Gëstu Policy

drop table if exists public.policy_effectiveness_attestations;
drop table if exists public.policy_acknowledgements;
drop table if exists public.policy_risk_links;
drop table if exists public.policy_control_links;

alter table if exists public.policies drop constraint if exists policies_current_version_fk;
drop table if exists public.policy_versions;
drop table if exists public.policies;
