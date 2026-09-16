-- Migration 00252 (UP) — RFC 0009 : correction de la liste blanche des templates.
--
-- Les étapes guidées des Travaux (fieldwork.*) sont retirées du scope : « Analyser »
-- (conformité + constats) et « Validation » (soumission) sont le NOYAU obligatoire
-- de l'évaluation, et « Observer »/« Documenter » n'apportent qu'une valeur marginale
-- pour un coût/risque élevé sur l'écran de saisie. Aucun consommateur ne les gère
-- (INC 2b abandonné). On les retire donc de la liste blanche CHECK.

-- Nettoyage préalable : purge toute clé fieldwork.* d'un template existant, sinon
-- le rétablissement de la contrainte échouerait.
update public.organization_workflow_templates
set disabled_steps = (
  select coalesce(array_agg(s), '{}')
  from unnest(disabled_steps) s
  where s not like 'fieldwork.%'
)
where exists (select 1 from unnest(disabled_steps) s where s like 'fieldwork.%');

alter table public.organization_workflow_templates
  drop constraint chk_workflow_template_whitelist;

alter table public.organization_workflow_templates
  add constraint chk_workflow_template_whitelist check (
    disabled_steps <@ array[
      'client_review', 'action_plan',
      'scoping.risks', 'scoping.questionnaire', 'scoping.documents', 'scoping.actors'
    ]::text[]
  );
