-- Migration 00241 (DOWN) : retire la fondation entitlement.
-- Table dormante en P1 → aucun autre objet ne référence org_entitlements.

drop function if exists public.verify_entitlement_invariance();
drop function if exists public.org_has_entitlement(uuid, text);
drop table if exists public.org_entitlements cascade;
