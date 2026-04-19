-- Migration: control_planning (DOWN)

drop table if exists public.control_planning cascade;
drop type if exists public.audit_technique;
drop type if exists public.risk_level;
