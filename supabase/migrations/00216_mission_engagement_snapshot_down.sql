-- Migration 00216 (DOWN) — P1b.2 (RFC 0007).
-- Retire la colonne snapshot. Les données probantes figées sont perdues :
-- à ne jouer que si le snapshot n'est pas encore exploité par un rapport.

alter table public.missions
  drop column if exists engagement_snapshot;
