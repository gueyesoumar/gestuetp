-- Migration 00243 (DOWN) : retire le mécanisme d'enforcement.
-- (Retirer aussi l'appel require-entitlement dans issue-measure via revert de code.)

drop function if exists public.gate_coverage_audit(text);
drop function if exists public.entitlement_allows(uuid, text);
drop table if exists public.entitlement_gate_policy;
