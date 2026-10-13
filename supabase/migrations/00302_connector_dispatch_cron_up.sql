-- P2 (RFC 0014 §4.4/§8) : collecte planifiée des connecteurs. Un job pg_cron appelle
-- l'edge connector-dispatch une fois par semaine (lundi 03:00 UTC). Le dispatcher
-- itère les intégrations actives et lance la collecte de chaque org.
--
-- SÉCURITÉ - aucun secret dans ce fichier. Les valeurs sont lues depuis Supabase Vault
-- PAR NOM (comme mig 00154). À créer AVANT le premier passage, PAR ENVIRONNEMENT :
--   vault.create_secret('<url projet>',  'functions_base_url')    -- ex. https://xxxx.supabase.co
--   vault.create_secret('<anon key>',    'edge_anon_key')         -- passe la gateway (JWT valide)
--   vault.create_secret('<secret cron>', 'connector_cron_secret') -- == env CONNECTOR_CRON_SECRET de l'edge
-- URL lue depuis Vault → sûr multi-env (pas d'URL en dur). Si un secret manque, le job
-- échoue silencieusement (cron.job_run_details) sans casser la migration.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Upsert par nom de job (pg_cron >= 1.4) : ré-exécutable sans doublon.
select cron.schedule(
  'connector-dispatch-weekly',
  '0 3 * * 1',
  $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/functions/v1/connector-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'connector_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
