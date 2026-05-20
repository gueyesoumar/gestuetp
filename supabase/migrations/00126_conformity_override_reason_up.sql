-- Migration: conformity_override_reason (UP)
-- Description: Ajoute une colonne de justification ecrite quand l'auditeur
-- choisit un conformity_level qui diverge de la suggestion auto-derivee
-- des findings (cf. matrice de coherence findings <-> conformity).
--
-- Politique : warning + justification obligatoire au submit (pas de blocage
-- dur). La validation cote serveur est faite par l'edge function
-- submit-assessment ; pas de CHECK constraint pour preserver la flexibilite
-- (l'auditeur garde sa liberte editoriale).
--
-- Cas NULL :
--   - Conformite coherente avec les findings (cas nominal)
--   - Assessment legacy (avant deploiement de cette feature)
--
-- Cas NOT NULL :
--   - Auditeur a choisi un niveau incoherent avec les findings et a
--     justifie son choix au moment du submit. Cette justification est
--     visible par le lead/associate dans la revue interne et persistee
--     dans l'audit trail.

alter table public.control_assessments
  add column if not exists conformity_override_reason text null;

comment on column public.control_assessments.conformity_override_reason is
  'Justification ecrite saisie par l''auditeur quand sa conformite diverge de la suggestion auto-derivee des findings. NULL si coherent.';
