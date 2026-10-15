-- 00310 - Gëstu Risk / RFC 0017 Lot 1 : cycle de vie d'un scénario de risque
-- (ISO 27005 : identifié -> analysé -> évalué -> traité -> accepté -> surveillé).
-- Additif ; l'enforcement serveur des transitions (exigence par étape) et les
-- familles d'audit risk.* sont différés (Lots 3/6). Ici : colonne + backfill + affichage.

alter table public.risk_scenarios
  add column lifecycle_status text not null default 'identified'
  check (lifecycle_status in (
    'identified','analysed','evaluated','treatment_planned',
    'in_treatment','residual_accepted','monitored','closed','reopened'
  ));

comment on column public.risk_scenarios.lifecycle_status is
  'Étape du cycle de vie ISO 27005 du scénario. Défaut identified ; transitions enforced en lot ultérieur.';

create index idx_risk_scenarios_lifecycle on public.risk_scenarios(lifecycle_status);

-- Backfill des scénarios existants (tous déjà cotés) selon l'état de traitement.
update public.risk_scenarios set lifecycle_status = 'analysed';
update public.risk_scenarios set lifecycle_status = 'treatment_planned' where treatment <> 'untreated';
update public.risk_scenarios set lifecycle_status = 'in_treatment'     where treatment <> 'untreated' and treatment_status = 'in_progress';
update public.risk_scenarios set lifecycle_status = 'monitored'        where treatment <> 'untreated' and treatment_status = 'done';
update public.risk_scenarios set lifecycle_status = 'residual_accepted' where treatment = 'accept';
