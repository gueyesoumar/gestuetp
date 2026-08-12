-- Migration: probative_occurred_at_force (UP)
-- Sévérité : Faible/INFO (audit OWASP 2026-08-11, A08 intégrité).
--
-- Le trigger probative_log_before_insert (00147) faisait
--   new.occurred_at := coalesce(new.occurred_at, now());
-- Il honorait donc une valeur `occurred_at` fournie par l'appelant. L'Edge Function
-- probative-log n'en fournit jamais (les inserts légitimes reçoivent déjà now()),
-- mais un acteur disposant du service_role et insérant en base directement pouvait
-- ANTIDATER un maillon (la chaîne de hash reste ordonnée par seq, pas par le temps).
--
-- Correctif : forcer `new.occurred_at := now()` (ignorer toute valeur fournie).
-- Le temps d'occurrence devient toujours le temps serveur de l'insert. Le sceau TSA
-- RFC-3161 périodique ancre déjà la tête de chaîne à une date vérifiable — cette
-- garde ferme le résiduel côté insert. Fonction redéfinie à l'identique de 00147
-- hormis cette ligne.

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
  new.occurred_at := now();  -- forcé : ignore toute valeur fournie (anti-antidatage)
  new.hash := public.probative_hash(public.probative_canonical(
    new.seq, new.occurred_at, new.actor_user_id, new.action_type,
    new.subject_type, new.subject_id, new.payload, new.prev_hash));
  return new;
end $$;
