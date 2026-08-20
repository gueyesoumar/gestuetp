-- Migration 00206 (UP) : bascule — capacités dérivées des abonnements (RFC 0006, C+P3)
--
-- organization_capabilities devient une PROJECTION de org_subscriptions. L'interface
-- de lecture (org_has_capability / my_capabilities / hasCapability) est INCHANGÉE :
-- seule la façon de peupler la table change. Le gating étant frontend (aucune policy
-- RLS de données ne lit organization_capabilities), le blast radius = visibilité UI.
--
-- Sécurité de bascule : (1) RÉCONCILIATION — on re-crée les abonnements depuis les
-- capacités actives actuelles (idempotent) AVANT le refresh, donc la projection ⊇
-- l'état actuel → aucune perte d'accès même si une capacité a dérivé depuis P2 ;
-- (2) refresh global ; (3) triggers attachés EN DERNIER (pas de cascade pendant le
-- backfill). Les éditions restent en place (scaffolding mort) — DROP en 00207.

-- 1. Projection : capacités actives/essai dérivées des abonnements ---------------
create or replace function public.refresh_org_capabilities(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  with target as (
    select pc.capability, s.status
    from public.org_subscriptions s
    join public.product_capability pc on pc.product_key = s.product_key
    where s.organization_id = p_org
      and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
    union
    select pf.capability, s.status
    from public.org_subscriptions s
    join public.org_subscription_features f on f.subscription_id = s.id
    join public.product_features pf on pf.product_key = s.product_key and pf.key = f.feature_key
    where s.organization_id = p_org
      and pf.capability is not null
      and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
  ),
  mapped as (
    select capability,
           (case when bool_or(status = 'active') then 'active' else 'trial' end)::public.capability_status as status
    from target group by capability
  )
  insert into public.organization_capabilities (org_id, capability, status)
  select p_org, capability, status from mapped
  on conflict (org_id, capability) do update set status = excluded.status;

  delete from public.organization_capabilities oc
  where oc.org_id = p_org
    and not exists (
      select 1 from public.org_subscriptions s
      join public.product_capability pc on pc.product_key = s.product_key and pc.capability = oc.capability
      where s.organization_id = p_org
        and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
      union
      select 1 from public.org_subscriptions s
      join public.org_subscription_features f on f.subscription_id = s.id
      join public.product_features pf on pf.product_key = s.product_key and pf.key = f.feature_key and pf.capability = oc.capability
      where s.organization_id = p_org
        and (s.status = 'active' or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now())))
    );
end; $$;
comment on function public.refresh_org_capabilities(uuid) is
  'Régénère organization_capabilities (projection) depuis les abonnements active/trial de l''org (RFC 0006 C+P3). Garde paresseuse essai. Unique écrivain de la table après la bascule.';

-- 2. Fonctions de trigger (refresh de l'org affectée) ---------------------------
create or replace function public.trg_refresh_org_caps()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_org_capabilities(coalesce(new.organization_id, old.organization_id));
  return null;
end; $$;

create or replace function public.trg_refresh_org_caps_feat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.org_subscriptions
  where id = coalesce(new.subscription_id, old.subscription_id);
  if v_org is not null then perform public.refresh_org_capabilities(v_org); end if;
  return null;
end; $$;

-- 3. Provisioning d'une nouvelle org : abonnement comply par défaut (ex-édition) -
create or replace function public.sync_org_capabilities()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_subscriptions (organization_id, product_key, status, unit_price)
  select new.id, 'comply', 'active', p.monthly_price
  from public.products p where p.key = 'comply'
  on conflict (organization_id, product_key) do nothing;

  insert into public.org_subscription_features (subscription_id, feature_key, unit_price)
  select s.id, pf.key, pf.monthly_price
  from public.org_subscriptions s
  join public.product_features pf on pf.product_key = 'comply' and pf.is_core
  where s.organization_id = new.id and s.product_key = 'comply'
  on conflict do nothing;

  perform public.refresh_org_capabilities(new.id);
  return new;
end; $$;
comment on function public.sync_org_capabilities() is
  'Provisionne une nouvelle org avec un abonnement comply par défaut (RFC 0006 C+P3, remplace le seed par édition).';

-- 4. Arête parent : nature dérivée de la capacité supervision (ex-édition) -------
create or replace function public.sync_org_parent_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nature public.relationship_nature;
begin
  if new.parent_org_id is not null then
    v_nature := case when exists (
        select 1 from public.organization_capabilities oc
        where oc.org_id = new.parent_org_id and oc.capability = 'supervision' and oc.status = 'active')
      then 'regulatory_supervision'::public.relationship_nature
      else 'group_ownership'::public.relationship_nature end;
    insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
    values (new.parent_org_id, new.id, v_nature, 'active')
    on conflict do nothing;
  end if;
  return new;
end; $$;

-- 5. RÉCONCILIATION : abonnements depuis les capacités actives actuelles ---------
--    (idempotent — rattrape toute capacité activée depuis le backfill P2 sans
--     abonnement, pour que la projection ne retire aucun accès existant).
insert into public.org_subscriptions (organization_id, product_key, status)
select oc.org_id, pc.product_key,
       (case oc.status::text when 'disabled' then 'suspended' else oc.status::text end)::public.subscription_status
from public.organization_capabilities oc
join public.product_capability pc on pc.capability = oc.capability
where oc.status <> 'disabled'
on conflict (organization_id, product_key) do nothing;

insert into public.org_subscription_features (subscription_id, feature_key)
select s.id, pf.key
from public.organization_capabilities oc
join public.product_features pf on pf.capability = oc.capability and pf.is_core = false
join public.org_subscriptions s on s.organization_id = oc.org_id and s.product_key = pf.product_key
where oc.status <> 'disabled'
on conflict (subscription_id, feature_key) do nothing;

-- 6. Refresh global : la projection devient la source de vérité ------------------
do $$ declare r record; begin
  for r in select id from public.organizations loop
    perform public.refresh_org_capabilities(r.id);
  end loop;
end $$;

-- 7. Triggers attachés EN DERNIER (aucune cascade pendant les étapes 5-6) --------
drop trigger if exists trg_org_sub_refresh on public.org_subscriptions;
create trigger trg_org_sub_refresh
  after insert or update or delete on public.org_subscriptions
  for each row execute function public.trg_refresh_org_caps();

drop trigger if exists trg_org_sub_feat_refresh on public.org_subscription_features;
create trigger trg_org_sub_feat_refresh
  after insert or update or delete on public.org_subscription_features
  for each row execute function public.trg_refresh_org_caps_feat();
