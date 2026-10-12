-- Rollback P1.1 : retire le socle du framework de conformité continue.
-- Ordre inverse des dépendances FK (evidence_results & control_check_links référencent
-- control_checks). Les secrets Vault éventuels (tokens / brut) ne sont PAS créés par
-- cette migration (edge en P1.3) ; rien à purger ici.
drop table if exists public.evidence_results;
drop table if exists public.connector_integrations;
drop table if exists public.control_check_links;
drop table if exists public.control_checks;
