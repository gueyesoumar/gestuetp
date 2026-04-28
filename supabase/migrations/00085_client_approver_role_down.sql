-- Migration 00085: Ajout du rôle 'approver' au portail client — DOWN
--
-- ATTENTION : il faut d'abord rétrograder les éventuels approvers en
-- contributors sinon la check constraint refusera la restauration.

UPDATE public.client_mission_access
SET permission = 'contributor'
WHERE permission = 'approver';

ALTER TABLE public.client_mission_access
  DROP CONSTRAINT IF EXISTS chk_cma_permission;

ALTER TABLE public.client_mission_access
  ADD CONSTRAINT chk_cma_permission
  CHECK (permission IN ('contributor', 'viewer'));

COMMENT ON COLUMN public.client_mission_access.permission IS NULL;
