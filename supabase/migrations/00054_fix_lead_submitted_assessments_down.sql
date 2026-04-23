-- Migration: fix lead-submitted assessments (DOWN)
-- Revert: remettre en 'submitted' les contrôles qui étaient soumis par le lead
-- Note: cette migration est idempotente mais le rollback est approximatif
-- car on ne peut pas distinguer les contrôles migrés des légitimes.

-- Pas de rollback fiable possible — ne rien faire.
SELECT 1;
