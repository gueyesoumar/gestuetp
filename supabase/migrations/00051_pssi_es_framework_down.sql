-- Migration: PSSI-ES Framework (DOWN)
-- Rollback: suppression du référentiel PSSI-ES et de tous ses domaines/contrôles (cascade)

DELETE FROM public.frameworks WHERE slug = 'pssi-es';
