-- Migration 00249 (UP) : watchdog des tâches planifiées (refonte Observabilité UI-2)
--
-- Expose l'état réel des jobs pg_cron (cron.job + cron.job_run_details) pour la
-- console super-admin : dernier run, statut, durée. Base du « dead-man's switch »
-- (un job quotidien non lancé depuis >25 h = alerte). Lecture seule, superadmin.

create or replace function public.admin_cron_status()
returns table(
  jobname text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_status text,
  last_duration_ms int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_platform_owner() or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select j.jobname::text,
           j.schedule::text,
           j.active,
           r.start_time as last_run_at,
           r.status::text as last_status,
           case when r.end_time is not null and r.start_time is not null
                then (extract(epoch from (r.end_time - r.start_time)) * 1000)::int
           end as last_duration_ms
    from cron.job j
    left join lateral (
      select d.start_time, d.end_time, d.status
      from cron.job_run_details d
      where d.jobid = j.jobid
      order by d.start_time desc nulls last
      limit 1
    ) r on true
    order by j.jobname;
end $$;
comment on function public.admin_cron_status() is
  'État des jobs pg_cron (dernier run/statut/durée) pour la console super-admin. Réservé is_platform_owner.';

grant execute on function public.admin_cron_status() to authenticated;
