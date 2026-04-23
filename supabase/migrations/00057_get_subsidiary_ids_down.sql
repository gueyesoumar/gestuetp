-- Migration 00057: Fonction get_subsidiary_ids (DOWN)
DROP FUNCTION IF EXISTS public.get_subsidiary_ids(uuid);
