-- Migration: controls_risk_level (UP)
-- Description: Ajoute un niveau de risque inherent au controle (1-5).
-- Utilise par la "Carte Enonce du controle" (workspace Phase 4) pour afficher
-- les risk dots et aider l'auditeur a prioriser ses observations.
--
-- Default 3 (risque modere) pour ne pas casser les controles existants.
-- L'admin Gestu pourra l'affiner par seed dedie.

alter table public.controls
  add column risk_level smallint not null default 3
    check (risk_level between 1 and 5);

comment on column public.controls.risk_level is
  'Niveau de risque inherent du controle (1=tres faible, 5=critique). Affiche en risk dots dans le workspace Phase 4.';

create index idx_controls_risk_level on public.controls(risk_level) where risk_level >= 4;
