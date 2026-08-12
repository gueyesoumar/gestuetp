-- Migration: probative_occurred_at_force (DOWN)
-- Restaure la version 00147 (coalesce : honore une valeur occurred_at fournie).

create or replace function public.probative_log_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_prev text; v_seq bigint;
begin
  perform pg_advisory_xact_lock(hashtext('probative_log_seq')::bigint);
  select seq, hash into v_seq, v_prev
  from public.probative_log order by seq desc limit 1;
  new.seq := coalesce(v_seq, 0) + 1;
  new.prev_hash := coalesce(v_prev, '');
  new.occurred_at := coalesce(new.occurred_at, now());
  new.hash := public.probative_hash(public.probative_canonical(
    new.seq, new.occurred_at, new.actor_user_id, new.action_type,
    new.subject_type, new.subject_id, new.payload, new.prev_hash));
  return new;
end $$;
