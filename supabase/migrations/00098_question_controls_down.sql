-- Migration: question_controls (DOWN)
-- Description: Rollback de 00098_question_controls_up.sql.

-- 2. Retrait du lien question -> preuve (drop l'index automatiquement avec la colonne)
alter table public.questions drop column if exists evidence_catalog_id;

-- 1. Suppression de la table de liaison
-- (drop table cascade les indexes idx_question_controls_* et la policy question_controls_select_authenticated)
drop table if exists public.question_controls;
