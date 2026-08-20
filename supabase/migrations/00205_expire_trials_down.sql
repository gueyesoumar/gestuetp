-- Migration 00205 (DOWN) : retrait du job d'expiration d'essai (RFC 0006, P4c)

do $$ begin
  if exists (select 1 from cron.job where jobname = 'expire-trials-daily') then
    perform cron.unschedule('expire-trials-daily');
  end if;
end $$;

drop function if exists public.expire_trials();
