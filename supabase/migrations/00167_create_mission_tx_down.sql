-- Migration: create_mission_tx (DOWN)
-- Rollback : supprime la fonction transactionnelle de création de mission.
-- L'Edge Function create-mission doit alors revenir à ses inserts séparés.

drop function if exists public.create_mission_tx(
  uuid, uuid, uuid, text, text, text, uuid, uuid, date, date, uuid[], uuid[], uuid, text, date, date
);
