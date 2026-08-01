-- 00150 — Horodatage RFC-3161 des sceaux (montée en exigence de la reco #3).
-- CIBLE: regul
--
-- En plus de l'émission e-mail, chaque sceau peut être horodaté par une Autorité
-- d'Horodatage (TSA, RFC-3161) : la TSA renvoie un jeton cryptographique signé
-- liant le hash de tête à une date UTC, vérifiable par un tiers sans confiance en
-- nous. On stocke le jeton brut (base64) — vérifiable hors-ligne via `openssl ts`.

alter table public.probative_seals
  add column if not exists tst text,          -- jeton d'horodatage (TimeStampResp DER, base64)
  add column if not exists tsa_url text,       -- URL de la TSA sollicitée
  add column if not exists tst_status text;    -- 'granted' | 'failed' | null (non demandé)

comment on column public.probative_seals.tst is
  'Jeton RFC-3161 (TimeStampResp DER, base64). Vérifiable hors-ligne : openssl ts -reply/-verify.';
