-- Migration 00254 (DOWN) — restaure la liste blanche 00252 (6 clés).
-- Purge d'abord les nouvelles clés d'un template existant, sinon l'ADD échoue.
update public.organization_workflow_templates
set disabled_steps = (
  select coalesce(array_agg(s), '{}')
  from unnest(disabled_steps) s
  where s not in ('planning.interviews', 'review.quality', 'review.discussion', 'closure.report')
)
where disabled_steps && array['planning.interviews', 'review.quality', 'review.discussion', 'closure.report']::text[];

alter table public.organization_workflow_templates
  drop constraint chk_workflow_template_whitelist;

alter table public.organization_workflow_templates
  add constraint chk_workflow_template_whitelist check (
    disabled_steps <@ array[
      'client_review', 'action_plan',
      'scoping.risks', 'scoping.questionnaire', 'scoping.documents', 'scoping.actors'
    ]::text[]
  );
