-- 00262 — Consentement IA par client + surcharge mission (P2 · RFC 0012, Décisions A & B).
-- Le consentement à l'envoi de données vers un modèle externe se décide au niveau du CLIENT
-- (fiche cabinet_clients), surchargeable par mission. Posture par défaut sûre : absence de
-- consentement = non consenti → le sensible « élevé » est bloqué (résolveur de politique).

-- Consentement porté par la fiche client (défaut NULL = non consenti).
alter table public.cabinet_clients
  add column if not exists ai_consent boolean,
  add column if not exists ai_consent_at timestamptz,
  add column if not exists ai_consent_by uuid references public.users(id) on delete set null;

comment on column public.cabinet_clients.ai_consent is
  'Consentement du client à l''envoi de ses données vers l''IA externe (NULL/false = non consenti).';

-- Surcharge au niveau mission (NULL = hérite de la fiche client ; true/false = force).
alter table public.missions
  add column if not exists ai_consent_override boolean;

comment on column public.missions.ai_consent_override is
  'Surcharge du consentement IA pour cette mission (NULL = hérite du client, true/false = force).';
