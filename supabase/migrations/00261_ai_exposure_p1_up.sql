-- 00261 — Score d'exposition IA (P1 · détection déterministe).
-- Stocke le résultat de la détection déterministe (pii-detect / exposure-score) exécutée
-- AVANT envoi au modèle. Observe-only : aucune valeur sensible n'est stockée, seulement le
-- niveau + les comptes par groupe. PDF/images = 'non_inspecte' (contenu non lisible côté edge).

alter table public.documents
  add column if not exists ai_sensitivity text,        -- faible | moyenne | elevee | non_inspecte
  add column if not exists ai_pii_count integer,
  add column if not exists ai_financial_count integer,
  add column if not exists ai_secret_count integer,
  add column if not exists ai_exposure_at timestamptz;

-- Score d'exposition par appel IA (flux smart-*), pour la piste d'audit / le futur panneau.
alter table public.ai_calls_log
  add column if not exists exposure_score integer,
  add column if not exists exposure_level text,
  add column if not exists exposure_pii integer,
  add column if not exists exposure_financial integer,
  add column if not exists exposure_secret integer;
