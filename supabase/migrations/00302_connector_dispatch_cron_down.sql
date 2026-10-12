-- Rollback P2 : déprogramme le job (no-op s'il n'existe pas). Les secrets Vault et
-- les extensions pg_cron/pg_net sont laissés en place (partagés avec d'autres jobs).
select cron.unschedule(jobid) from cron.job where jobname = 'connector-dispatch-weekly';
