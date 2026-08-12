-- Migration: regul_entity_types (DOWN)
-- Restaure le CHECK Comply-only. ATTENTION : échoue si des lignes portent déjà un
-- type Regul (ministere, agence…) — les remettre à NULL / un type Comply d'abord.

alter table public.organizations drop constraint if exists organizations_entity_type_check;

alter table public.organizations
  add constraint organizations_entity_type_check
  check (entity_type is null or entity_type in ('filiale', 'site', 'direction', 'business_unit'));
