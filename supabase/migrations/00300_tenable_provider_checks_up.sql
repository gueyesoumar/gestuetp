-- P1.1b (RFC 0014) : pivote le pilote vers Tenable Vulnerability Management (cloud,
-- ex-Tenable.io). Additif : ajoute 'tenable' aux providers autorisés + seed 3 checks
-- de gestion des vulnérabilités (ISO 27001:2022 A.8.8 - vulnérabilités techniques).
-- Auth Tenable = clés d'API PAR ORG (accessKey/secretKey, stockées en Vault via
-- connector_integrations.secret_ref) → aucune app OAuth plateforme requise.

alter table public.control_checks
  drop constraint if exists control_checks_provider_check,
  add constraint control_checks_provider_check
    check (provider in ('entra', 'google', 'github', 'aws', 'azure', 'gcp', 'tenable'));

alter table public.connector_integrations
  drop constraint if exists connector_integrations_provider_check,
  add constraint connector_integrations_provider_check
    check (provider in ('entra', 'google', 'github', 'aws', 'azure', 'gcp', 'tenable'));

insert into public.control_checks (provider, check_key, title, description, default_params, dimension, severity_on_fail) values
  ('tenable', 'tenable.no_critical_open',
   'Aucune vulnérabilité critique ouverte',
   'Signale la présence de vulnérabilités de sévérité critique non corrigées au-delà du seuil toléré.',
   '{"max_open_critical": 0}'::jsonb,
   'security', 'critique'),
  ('tenable', 'tenable.remediation_sla',
   'Remédiation des vulnérabilités sous SLA',
   'Vérifie que les vulnérabilités critiques et élevées sont corrigées dans les délais (critiques ≤ 30 j, élevées ≤ 90 j).',
   '{"critical_sla_days": 30, "high_sla_days": 90}'::jsonb,
   'security', 'fort'),
  ('tenable', 'tenable.scan_coverage',
   'Couverture et fraîcheur des scans',
   'Vérifie que les actifs ont été scannés récemment (moins de 30 jours) - détecte un parc non surveillé.',
   '{"max_scan_age_days": 30}'::jsonb,
   'security', 'moyen')
on conflict (check_key) do nothing;
