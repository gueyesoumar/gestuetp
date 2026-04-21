-- Migration: member_audit_logs (DOWN)
-- Rollback: suppression de la table d'historique des actions membres

DROP POLICY IF EXISTS "audit_insert_org" ON public.member_audit_logs;
DROP POLICY IF EXISTS "audit_select_org" ON public.member_audit_logs;
DROP TABLE IF EXISTS public.member_audit_logs;
