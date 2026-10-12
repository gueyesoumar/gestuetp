-- P3 (RFC 0014) : connecteur GitHub (dév. sécurisé + 2FA). Additif : seed 3 checks
-- org-level, tous dérivés d'un seul appel GET /orgs/{org}. Provider 'github' déjà
-- autorisé (00300). ISO 27001:2022 A.8.25-A.8.28 (dév. sécurisé) + accès (2FA).

insert into public.control_checks (provider, check_key, title, description, default_params, dimension, severity_on_fail) values
  ('github', 'github.org_2fa_required',
   'Authentification à deux facteurs obligatoire',
   'Vérifie que l''organisation GitHub impose le 2FA à tous ses membres.',
   '{}'::jsonb, 'security', 'critique'),
  ('github', 'github.dependabot_alerts',
   'Alertes de vulnérabilités de dépendances activées',
   'Vérifie que les alertes Dependabot (SCA) sont activées par défaut sur les nouveaux dépôts.',
   '{}'::jsonb, 'security', 'fort'),
  ('github', 'github.secret_scanning',
   'Scan de secrets activé',
   'Vérifie que le scan de secrets est activé par défaut sur les nouveaux dépôts.',
   '{}'::jsonb, 'security', 'fort')
on conflict (check_key) do nothing;
