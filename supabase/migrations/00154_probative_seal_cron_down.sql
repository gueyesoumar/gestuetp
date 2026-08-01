-- Migration 00154 (DOWN) : dé-planification du scellement probant
-- Retire le job cron. Les extensions pg_cron / pg_net sont laissées en place
-- (elles peuvent servir à d'autres jobs). Les secrets Vault ne sont pas touchés.

select cron.unschedule('probative-seal-daily');
