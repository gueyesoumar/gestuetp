-- Migration 00248 (DOWN) : restaure le pont + provisioning via org_subscriptions.

-- 1. Retrait du trigger de projection sur org_entitlements
drop trigger if exists trg_entitlement_refresh on public.org_entitlements;
drop function if exists public.trg_entitlement_refresh();

-- 2. Provisioning restauré (00206 : écrit org_subscriptions)
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

  return new;
end $$;

-- 3. Pont restauré (00245 non-destructif) + fonctions/triggers de pont (00242)
create or replace function public.sync_entitlements_from_subscription(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_entitlements
    (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, discount_pct, source, capability, granted_at)
  select s.organization_id, s.product_key, s.status, s.trial_ends_at,
         case when s.unit_price > 0 then 'flat' else 'none' end,
         nullif(s.unit_price, 0),
         case when s.unit_price > 0 then 'month' end,
         s.discount_pct,
         coalesce('plan:' || s.plan_slug, 'subscription'),
         (select pc.capability from public.product_capability pc where pc.product_key = s.product_key order by pc.capability limit 1),
         s.started_at
  from public.org_subscriptions s
  where s.organization_id = p_org
  on conflict (organization_id, key) do update
    set status = excluded.status, trial_ends_at = excluded.trial_ends_at,
        capability = excluded.capability, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  insert into public.org_entitlements
    (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select s.organization_id, f.feature_key, s.status, s.trial_ends_at,
         case when f.unit_price > 0 then 'flat' else 'none' end,
         nullif(f.unit_price, 0),
         case when f.unit_price > 0 then 'month' end,
         'subscription',
         (select pf.capability from public.product_features pf where pf.product_key = s.product_key and pf.key = f.feature_key),
         s.started_at
  from public.org_subscription_features f
  join public.org_subscriptions s on s.id = f.subscription_id
  where s.organization_id = p_org
  on conflict (organization_id, key) do update
    set status = excluded.status, trial_ends_at = excluded.trial_ends_at,
        capability = excluded.capability, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  delete from public.org_entitlements e
  where e.organization_id = p_org and e.key not in ('users', 'missions') and e.source <> 'manual'
    and not exists (select 1 from public.org_subscriptions s where s.organization_id = p_org and s.product_key = e.key)
    and not exists (select 1 from public.org_subscription_features f
                    join public.org_subscriptions s on s.id = f.subscription_id
                    where s.organization_id = p_org and f.feature_key = e.key);

  perform public.refresh_org_capabilities(p_org);
end $$;

create or replace function public.sync_entitlements_quota(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.org_entitlements
  where organization_id = p_org and key in ('users', 'missions') and source <> 'manual';
  insert into public.org_entitlements (organization_id, key, limit_value, pricing_kind, source, granted_at)
  select p_org, q.quota_key,
         coalesce(
           (select ql.limit_value from public.org_quota_limits ql where ql.organization_id = p_org and ql.quota_key = q.quota_key),
           case q.quota_key when 'users' then p.max_users when 'missions' then p.max_missions end
         ),
         'none', 'sync', now()
  from (values ('users'), ('missions')) as q(quota_key)
  left join public.organizations o on o.id = p_org
  left join public.plans p on p.id = o.plan_id
  where (o.plan_id is not null or exists (select 1 from public.org_quota_limits ql where ql.organization_id = p_org))
    and not exists (select 1 from public.org_entitlements e where e.organization_id = p_org and e.key = q.quota_key and e.source = 'manual')
  on conflict (organization_id, key) do nothing;
end $$;

create or replace function public.trg_bridge_sub()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_entitlements_from_subscription(coalesce(new.organization_id, old.organization_id));
  return null;
end $$;

create or replace function public.trg_bridge_sub_feat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.org_subscriptions where id = coalesce(new.subscription_id, old.subscription_id);
  if v_org is not null then perform public.sync_entitlements_from_subscription(v_org); end if;
  return null;
end $$;

create or replace function public.trg_bridge_quota()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_entitlements_quota(coalesce(new.organization_id, old.organization_id));
  return null;
end $$;

drop trigger if exists trg_bridge_sub on public.org_subscriptions;
create trigger trg_bridge_sub after insert or update or delete on public.org_subscriptions
  for each row execute function public.trg_bridge_sub();
drop trigger if exists trg_bridge_sub_feat on public.org_subscription_features;
create trigger trg_bridge_sub_feat after insert or update or delete on public.org_subscription_features
  for each row execute function public.trg_bridge_sub_feat();
drop trigger if exists trg_bridge_quota on public.org_quota_limits;
create trigger trg_bridge_quota after insert or update or delete on public.org_quota_limits
  for each row execute function public.trg_bridge_quota();

-- 4. apply_entitlement_template restauré avec refresh explicite (00247)
create or replace function public.apply_entitlement_template(p_org uuid, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_entitlements
    (organization_id, key, status, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select p_org, pp.product_key, 'active',
         case when pr.monthly_price > 0 then 'flat' else 'none' end,
         nullif(pr.monthly_price, 0),
         case when pr.monthly_price > 0 then 'month' end,
         'plan:' || p_plan,
         (select pc.capability from public.product_capability pc where pc.product_key = pp.product_key order by pc.capability limit 1),
         now()
  from public.plan_products pp join public.products pr on pr.key = pp.product_key
  where pp.plan_slug = p_plan
  on conflict (organization_id, key) do update
    set status = 'active', pricing_kind = excluded.pricing_kind, price_amount = excluded.price_amount,
        price_unit = excluded.price_unit, capability = excluded.capability, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  insert into public.org_entitlements
    (organization_id, key, status, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select p_org, bf.feature_key, 'active',
         case when pf.monthly_price > 0 then 'flat' else 'none' end,
         nullif(pf.monthly_price, 0),
         case when pf.monthly_price > 0 then 'month' end,
         'plan:' || p_plan, pf.capability, now()
  from public.plan_bundle_features bf
  join public.product_features pf on pf.product_key = bf.product_key and pf.key = bf.feature_key
  where bf.plan_slug = p_plan
  on conflict (organization_id, key) do update
    set status = 'active', pricing_kind = excluded.pricing_kind, price_amount = excluded.price_amount,
        price_unit = excluded.price_unit, capability = excluded.capability, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  insert into public.org_entitlements (organization_id, key, limit_value, pricing_kind, source, granted_at)
  select p_org, pq.quota_key, pq.limit_value, 'none', 'plan:' || p_plan, now()
  from public.plan_quotas pq where pq.plan_slug = p_plan
  on conflict (organization_id, key) do update
    set limit_value = excluded.limit_value, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  update public.organizations o set home_product = pl.home_product
  from public.plans pl where o.id = p_org and pl.slug = p_plan and pl.home_product is not null;

  perform public.refresh_org_capabilities(p_org);
end $$;
