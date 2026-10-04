-- Rollback 00262 — retrait du consentement IA par client + surcharge mission.

alter table public.missions
  drop column if exists ai_consent_override;

alter table public.cabinet_clients
  drop column if exists ai_consent,
  drop column if exists ai_consent_at,
  drop column if exists ai_consent_by;
