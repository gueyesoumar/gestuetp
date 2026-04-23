-- Migration 00059: Table audit_campaigns + campaign_id sur missions (DOWN)

-- 1. Retirer la colonne campaign_id de missions
ALTER TABLE public.missions DROP COLUMN IF EXISTS campaign_id;

-- 2. Supprimer la table et le type
DROP TABLE IF EXISTS public.audit_campaigns CASCADE;
DROP TYPE IF EXISTS public.campaign_status;
