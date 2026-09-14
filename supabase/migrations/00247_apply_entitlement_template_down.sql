-- Migration 00247 (DOWN)
drop function if exists public.apply_entitlement_template(uuid, text);
