-- Migration: audit_checklist (UP)
-- Description: Ajoute une colonne JSONB audit_checklist sur public.controls
-- pour materialiser la "tip card" du workspace Phase 4 (liste de points a verifier
-- specifique a chaque controle). Distingue de la colonne existante 'guidance' qui decrit
-- comment IMPLEMENTER le controle. audit_checklist decrit comment VERIFIER que le
-- controle est en place, du point de vue auditeur.
--
-- Format des items (validation cote UI uniquement, schema souple) :
--   [
--     {
--       "label": string,                                              -- obligatoire, point a verifier
--       "hint"?: string,                                              -- optionnel, format Markdown limite
--       "evidence_type"?: "document"|"interview"|"observation"|"test" -- optionnel, type de preuve attendue
--     },
--     ...
--   ]
--
-- Voir HANDOFF_PORTAGE.md, refactor D et project_findings_centric.md.

alter table public.controls
  add column audit_checklist jsonb not null default '[]'::jsonb;

alter table public.controls
  add constraint chk_audit_checklist_is_array
  check (jsonb_typeof(audit_checklist) = 'array');

comment on column public.controls.audit_checklist is
  'Liste de points a verifier lors de l''audit de ce controle. Format : tableau d''objets [{ "label": string, "hint"?: string (Markdown limite), "evidence_type"?: "document"|"interview"|"observation"|"test" }]. Affiche dans la tip card du workspace Phase 4 (ObserverStep) et passe en contexte au prompt smart-analyse pour des suggestions IA plus precises. Distinct de "guidance" (qui decrit comment IMPLEMENTER le controle).';
