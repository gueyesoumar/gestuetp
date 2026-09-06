-- Migration 00215 (DOWN) — P1b.1 (RFC 0007).
-- Table additive miroir de cabinet_clients (source restée en place en P1b).
-- La supprimer ne perd aucune donnée métier tant que P1c (bascule en vue) n'a
-- pas retiré les colonnes de cabinet_clients. À NE PAS jouer après P1c.

drop table if exists public.engagement_profiles cascade;
