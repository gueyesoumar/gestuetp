-- Migration 00205 (UP) : expiration automatique des essais (RFC 0006, P4c, décision 10.5)
--
-- À l'expiration de trial_ends_at, l'abonnement passe en `suspended` (accès coupé,
-- historique conservé) — JAMAIS de bascule automatique en `active` (pas de
-- facturation implicite). Chaque expiration est journalisée dans activity_log
-- (source 'system') → visible dans la piste d'audit du superadmin = la notification.
--
-- Cron SQL PUR (pas d'appel HTTP/edge) → env-agnostique (pas d'URL en dur, contrairement
-- à 00154). La conversion en actif reste un acte commercial explicite (console P4).

create extension if not exists pg_cron;

create or replace function public.expire_trials()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; v_count int := 0;
begin
  for r in
    select s.id, s.organization_id, s.product_key
    from public.org_subscriptions s
    where s.status = 'trial' and s.trial_ends_at is not null and s.trial_ends_at < now()
  loop
    update public.org_subscriptions
      set status = 'suspended', suspended_at = now(), updated_at = now()
      where id = r.id;

    insert into public.activity_log
      (organization_id, actor_user_id, actor_label, action, target_type, target_id, summary, metadata, source)
    values
      (r.organization_id, null, 'Système (expiration essai)', 'subscription.trial_expired',
       'organization', r.organization_id, 'Essai expiré, produit suspendu',
       jsonb_build_object('product_key', r.product_key), 'system');

    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
comment on function public.expire_trials() is
  'Passe en suspended les abonnements en essai dont trial_ends_at est dépassé (RFC 0006 10.5). Journalise chaque expiration (activity_log, source system). Jamais de facturation implicite.';

-- Planification quotidienne (03:00 UTC). Upsert par nom (pg_cron >= 1.4).
select cron.schedule('expire-trials-daily', '0 3 * * *', $$ select public.expire_trials(); $$);
