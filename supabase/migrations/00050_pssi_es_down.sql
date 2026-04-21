-- Migration: PSSI-ES (DOWN)
-- Rollback: suppression de la PSSI-ES du catalogue réglementaire

DELETE FROM public.regulatory_catalog WHERE short_name = 'PSSI-ES';
