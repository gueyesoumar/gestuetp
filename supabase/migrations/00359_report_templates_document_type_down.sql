-- Rollback RFC 0021 E2.0 : retour aux contraintes mono-document (rapport d'audit).

drop index if exists idx_report_templates_document_type;

drop index if exists uniq_report_templates_cabinet_default;
create unique index uniq_report_templates_cabinet_default
  on public.report_templates(organization_id)
  where is_default and scope = 'cabinet';

drop index if exists uniq_report_templates_client;
create unique index uniq_report_templates_client
  on public.report_templates(organization_id, client_id)
  where scope = 'client';

alter table public.report_templates drop column if exists document_type;
