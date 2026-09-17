-- Migration 00252 (DOWN) — rétablit la liste blanche d'origine (avec fieldwork.*)
alter table public.organization_workflow_templates
  drop constraint chk_workflow_template_whitelist;

alter table public.organization_workflow_templates
  add constraint chk_workflow_template_whitelist check (
    disabled_steps <@ array[
      'client_review', 'action_plan',
      'scoping.risks', 'scoping.questionnaire', 'scoping.documents', 'scoping.actors',
      'fieldwork.observe', 'fieldwork.document', 'fieldwork.analyze', 'fieldwork.validate'
    ]::text[]
  );
