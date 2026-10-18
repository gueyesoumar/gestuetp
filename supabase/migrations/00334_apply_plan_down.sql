-- 00334 (DOWN) - restaure apply_entitlement_template (00248) et retire apply_plan.
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

drop function if exists public.apply_plan(uuid, text);
