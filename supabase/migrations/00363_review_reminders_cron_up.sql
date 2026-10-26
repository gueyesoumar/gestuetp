-- n°18 Lot 2 : rappels automatiques de revue périodique. Un job pg_cron appelle
-- l'edge review-reminders tous les jours à 07:00 UTC. L'edge calcule les paliers
-- (J-30 / J-7 / échéance) et prévient les superviseurs assignés (in-app + email).
--
-- SÉCURITÉ - aucun secret dans ce fichier. Les valeurs sont lues depuis Supabase Vault
-- PAR NOM (comme mig 00302/00154). À créer AVANT le premier passage, PAR ENVIRONNEMENT :
--   vault.create_secret('<url projet>', 'functions_base_url')   -- déjà posé pour le cron connecteurs
--   vault.create_secret('<anon key>',   'edge_anon_key')        -- déjà posé pour le cron connecteurs
--   vault.create_secret('<secret cron>','review_cron_secret')   -- == env REVIEW_CRON_SECRET de l'edge
-- Si un secret manque, le job échoue silencieusement (cron.job_run_details) sans casser la migration.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Upsert par nom de job (pg_cron >= 1.4) : ré-exécutable sans doublon.
select cron.schedule(
  'review-reminders-daily',
  '0 7 * * *',
  $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/functions/v1/review-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'review_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
