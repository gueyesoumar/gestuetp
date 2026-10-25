-- RFC 0021 E2.0 : rendre report_templates multi-documents.
-- Ajoute document_type (type de document couvert par le modele). Les lignes
-- existantes sont des modeles de rapport d'audit -> defaut 'audit_report'.
-- Les contraintes d'unicite (defaut cabinet, modele client) sont desormais
-- portees PAR TYPE DE DOCUMENT.

alter table public.report_templates
  add column if not exists document_type text not null default 'audit_report'
  check (document_type in ('audit_report', 'scoping_note', 'interview_cr'));

-- Un seul modele par defaut cabinet PAR TYPE DE DOCUMENT.
drop index if exists uniq_report_templates_cabinet_default;
create unique index uniq_report_templates_cabinet_default
  on public.report_templates(organization_id, document_type)
  where is_default and scope = 'cabinet';

-- Un seul modele client PAR TYPE DE DOCUMENT.
drop index if exists uniq_report_templates_client;
create unique index uniq_report_templates_client
  on public.report_templates(organization_id, client_id, document_type)
  where scope = 'client';

create index if not exists idx_report_templates_document_type
  on public.report_templates(document_type);
