-- Migration 00248 (UP) : org_entitlements devient SEUL maître d'écriture (RFC 0008 / INC 5c-2)
--
-- Swap final : le provisioning écrit org_entitlements directement, un trigger sur
-- org_entitlements pilote la projection des capacités, et le PONT est retiré.
-- org_subscriptions / org_quota_limits deviennent legacy (conservés, plus écrits,
-- plus lus pour le gating).

-- 1. Provisioning des nouvelles orgs → écrit org_entitlements ---------------------
create or replace function public.sync_org_capabilities()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Droit Comply (produit) + features core de Comply.
  insert into public.org_entitlements
    (organization_id, key, status, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select new.id, 'comply', 'active',
         case when pr.monthly_price > 0 then 'flat' else 'none' end,
         nullif(pr.monthly_price, 0),
         case when pr.monthly_price > 0 then 'month' end,
         'provisioning',
         (select pc.capability from public.product_capability pc where pc.product_key = 'comply' limit 1),
         now()
  from public.products pr where pr.key = 'comply'
  on conflict (organization_id, key) do nothing;

  insert into public.org_entitlements
    (organization_id, key, status, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select new.id, pf.key, 'active',
         case when pf.monthly_price > 0 then 'flat' else 'none' end,
         nullif(pf.monthly_price, 0),
         case when pf.monthly_price > 0 then 'month' end,
         'provisioning', pf.capability, now()
  from public.product_features pf where pf.product_key = 'comply' and pf.is_core
  on conflict (organization_id, key) do nothing;

  perform public.refresh_org_capabilities(new.id);
  return new;
end $$;

-- 2. Projection pilotée par org_entitlements (toute voie d'écriture) --------------
create or replace function public.trg_entitlement_refresh()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_org_capabilities(coalesce(new.organization_id, old.organization_id));
  return null;
end $$;

drop trigger if exists trg_entitlement_refresh on public.org_entitlements;
create trigger trg_entitlement_refresh
  after insert or update or delete on public.org_entitlements
  for each row execute function public.trg_entitlement_refresh();

-- 3. apply_entitlement_template : sans refresh explicite (le trigger s'en charge) --
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
  from public.plan_products pp
  join public.products pr on pr.key = pp.product_key
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
  from public.plan_quotas pq
  where pq.plan_slug = p_plan
  on conflict (organization_id, key) do update
    set limit_value = excluded.limit_value, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  update public.organizations o
    set home_product = pl.home_product
  from public.plans pl
  where o.id = p_org and pl.slug = p_plan and pl.home_product is not null;
end $$;

-- 4. Retrait du PONT (org_subscriptions/features/quota ne pilotent plus rien) ------
drop trigger if exists trg_bridge_sub on public.org_subscriptions;
drop trigger if exists trg_bridge_sub_feat on public.org_subscription_features;
drop trigger if exists trg_bridge_quota on public.org_quota_limits;
drop function if exists public.trg_bridge_sub();
drop function if exists public.trg_bridge_sub_feat();
drop function if exists public.trg_bridge_quota();
drop function if exists public.sync_entitlements_from_subscription(uuid);
drop function if exists public.sync_entitlements_quota(uuid);

-- 5. Garde d'invariance (données inchangées ; seules les voies d'écriture changent)
do $$
declare v_diff int;
begin
  select count(*) into v_diff from public.verify_entitlement_invariance();
  raise notice '[00248] Invariance capacites (org_entitlements maitre) : % ecart(s) (attendu 0)', v_diff;
end $$;
