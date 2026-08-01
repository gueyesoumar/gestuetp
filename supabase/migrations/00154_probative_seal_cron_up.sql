-- Migration 00154 (UP) : planification du scellement probant (Gëstu Regul)
-- Ancrage externe périodique du journal probant : un job pg_cron appelle
-- l'Edge Function probative-seal (action=seal) une fois par jour. La fonction
-- fige la tête de chaîne, sollicite la TSA RFC-3161 et émet le sceau au témoin
-- externe (email).
--
-- SÉCURITÉ — aucun secret dans ce fichier :
--   * l'anon key et le cron secret sont lus depuis Supabase Vault par leur NOM ;
--   * tu dois créer ces 2 secrets AVANT le premier passage (voir instructions
--     hors-migration : vault.create_secret('<valeur>', '<nom>')).
--   * la fonction accepte l'appel via l'en-tête x-cron-secret (chemin cron) ;
--     l'en-tête Authorization: Bearer <anon> ne sert qu'à passer la gateway.
--
-- Fréquence : quotidienne à 02:00 UTC. Adapter l'expression cron au besoin.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Upsert par nom de job (pg_cron >= 1.4) : ré-exécutable sans doublon.
select cron.schedule(
  'probative-seal-daily',
  '0 2 * * *',
  $CRON$
  select net.http_post(
    url := 'https://snayznxraupndrdmhbak.supabase.co/functions/v1/probative-seal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'probative_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'probative_cron_secret')
    ),
    body := jsonb_build_object('action', 'seal')
  );
  $CRON$
);
