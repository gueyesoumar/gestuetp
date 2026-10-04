-- 00265 — Détail par catégorie de la détection déterministe (P2, affichage « raison du classement »).
-- Comptes PAR CATÉGORIE (email, phone_sn, iban, card, ip, ninea, cni_nin_sn, api_key,
-- private_key, secret_assignment). JAMAIS les valeurs ni les positions — comptes only.
alter table public.documents
  add column if not exists ai_detected_categories jsonb;

comment on column public.documents.ai_detected_categories is
  'Détail par catégorie de la détection IA (comptes uniquement, aucune valeur). RFC 0012 P2.';
