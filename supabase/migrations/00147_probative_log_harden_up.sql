-- 00147 — Durcissement du journal probant (revue pré-audit).
--
-- (1) SÉCURITÉ (bloquant) : la policy SELECT probative_log_select_staff était
--     `not is_client_role()` SANS borne de tenant → tout staff lisait le journal
--     de TOUS les régulateurs (titres/gravités d'incidents, types/échéances de
--     mesures d'autres assujettis). On scope désormais au sous-arbre du régulateur
--     via la table source (incidents / regulatory_measures), + platform_owner.
-- (2) ROBUSTESSE (majeur) : le calcul de seq/prev_hash lisait le dernier seq sans
--     verrou → course concurrente possible (collision hash UNIQUE, acte non ancré).
--     On sérialise les appends via un verrou transactionnel consultatif.

-- (1) Policy SELECT scopée au périmètre
drop policy if exists "probative_log_select_staff" on public.probative_log;
create policy "probative_log_select_scoped"
  on public.probative_log for select to authenticated
  using (
    public.is_platform_owner()
    or (
      not public.is_client_role()
      and (
        (subject_type = 'incident' and subject_id in (
          select i.id from public.incidents i
          where i.entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
        ))
        or (subject_type = 'measure' and subject_id in (
          select m.id from public.regulatory_measures m
          where m.entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))
        ))
      )
    )
  );

-- (2) Verrou consultatif transactionnel pour sérialiser l'attribution de seq
create or replace function public.probative_log_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_prev text; v_seq bigint;
begin
  -- Sérialise les appends concurrents : évite deux inserts calculant le même seq.
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
