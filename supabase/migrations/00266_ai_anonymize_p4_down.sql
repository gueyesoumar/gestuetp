-- Rollback 00266 — retire l'opt-in d'anonymisation réversible (P4.1 · RFC 0012).

alter table public.missions
  drop column if exists ai_anonymize_override;

alter table public.cabinet_clients
  drop column if exists ai_anonymize_by,
  drop column if exists ai_anonymize_at,
  drop column if exists ai_anonymize;
