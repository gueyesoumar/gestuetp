-- 00147 (DOWN) — restaure la policy non scopée et le trigger sans verrou.
drop policy if exists "probative_log_select_scoped" on public.probative_log;
create policy "probative_log_select_staff"
  on public.probative_log for select to authenticated
  using (not public.is_client_role());

create or replace function public.probative_log_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_prev text; v_seq bigint;
begin
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
