-- Migration 00124: Seed initial plan_features (DOWN)
-- Rollback de 00124_seed_plan_features_up.sql
-- ATTENTION: vide intégralement la table. Si l'admin a personnalisé les associations,
-- elles seront perdues. À utiliser uniquement pour un rollback complet de la Piste B.

DELETE FROM public.plan_features;
