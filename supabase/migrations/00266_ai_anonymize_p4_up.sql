-- 00266 — Anonymisation réversible avant envoi IA (P4.1 · RFC 0012).
-- Opt-in par CLIENT (fiche cabinet_clients), surchargeable par mission — même modèle
-- que le consentement (mig 00262). Quand il est actif, le texte envoyé au modèle est
-- pseudonymisé (jetons cohérents) et la réponse est ré-hydratée côté serveur ; la table
-- de correspondance n'est jamais transmise au modèle ni persistée en clair.
-- Posture par défaut : NULL/false = désactivé (comportement P2 inchangé).

-- Activation portée par la fiche client (défaut NULL = désactivé).
alter table public.cabinet_clients
  add column if not exists ai_anonymize boolean,
  add column if not exists ai_anonymize_at timestamptz,
  add column if not exists ai_anonymize_by uuid references public.users(id) on delete set null;

comment on column public.cabinet_clients.ai_anonymize is
  'Anonymisation réversible des données de ce client avant envoi IA (NULL/false = désactivé).';

-- Surcharge au niveau mission (NULL = hérite de la fiche client ; true/false = force).
alter table public.missions
  add column if not exists ai_anonymize_override boolean;

comment on column public.missions.ai_anonymize_override is
  'Surcharge de l''anonymisation IA pour cette mission (NULL = hérite du client, true/false = force).';
