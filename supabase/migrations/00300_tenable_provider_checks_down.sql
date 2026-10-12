-- Rollback P1.1b : retire Tenable (checks, preuves, intégrations) puis resserre les
-- contraintes de provider. Ordre : purge des lignes dépendantes avant le re-check
-- (evidence_results.check_id est on delete restrict → supprimer les preuves d'abord).
delete from public.evidence_results
  where check_id in (select id from public.control_checks where provider = 'tenable');
delete from public.connector_integrations where provider = 'tenable';
delete from public.control_checks where provider = 'tenable';

alter table public.control_checks
  drop constraint if exists control_checks_provider_check,
  add constraint control_checks_provider_check
    check (provider in ('entra', 'google', 'github', 'aws', 'azure', 'gcp'));

alter table public.connector_integrations
  drop constraint if exists connector_integrations_provider_check,
  add constraint connector_integrations_provider_check
    check (provider in ('entra', 'google', 'github', 'aws', 'azure', 'gcp'));
