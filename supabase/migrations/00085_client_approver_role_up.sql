-- Migration 00085: Ajout du rôle 'approver' au portail client — UP
--
-- Élargit la check constraint sur client_mission_access.permission pour inclure
-- 'approver'. Sémantique : approver = contributor + droit de signer (valider
-- les contrôles au stade client_review).
--
-- Aucune migration de données : les contributeurs existants restent
-- contributors. Le cabinet auditeur attribue explicitement 'approver' aux
-- dirigeants concernés via PortalInviteModal (UI) ou en SQL direct.
--
-- Les RLS qui s'appuient sur permission='contributor' sont mises à jour dans
-- la migration 00086 pour également accepter 'approver' (puisque approver
-- hérite de tous les droits contributor).

ALTER TABLE public.client_mission_access
  DROP CONSTRAINT IF EXISTS chk_cma_permission;

ALTER TABLE public.client_mission_access
  ADD CONSTRAINT chk_cma_permission
  CHECK (permission IN ('contributor', 'viewer', 'approver'));

COMMENT ON COLUMN public.client_mission_access.permission IS
  'Rôle du contact sur la mission. viewer = lecture seule. contributor = lecture + actions (observations, CAR, actions, docs, questionnaire). approver = contributor + signature client_review des contrôles.';
