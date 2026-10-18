-- 00334 - RFC 0018 Phase 2 : apply_plan, application cohérente d'un plan.
--
-- Appliquer un plan devient UNE opération : pose organizations.plan_id (-> prix affiché
-- plans.monthly_price + recalcul des 10 flags de gating via le pont Phase 1), écrit les
-- entitlements de MODULES (plan_products -> capacité) et de QUOTAS (plan_quotas), et
-- RETIRE les entitlements d'un plan précédent. Préserve les octrois `manual` (P2-c ; les
-- surcharges de flags vivent dans feature_flag_overrides, honorées par le pont).
-- Découplé de la facturation (P2-d option i) : ne touche PAS org_subscriptions (RFC 0019).
-- A' : les fonctionnalités de gating viennent de plan_features (via le pont, par plan_id) ;
-- product_features/plan_bundle_features restent le catalogue d'affichage du Hub.

create or replace function public.apply_plan(p_org uuid, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.plans where slug = p_plan) then
    raise exception 'plan inconnu: %', p_plan;
  end if;

  -- 1. Pose le plan (prix affiche via plans.monthly_price ; declenche le pont Phase 1
  --    qui recalcule les feature.<slug> depuis plan_features + overrides).
  update public.organizations o
    set plan_id = pl.id
    from public.plans pl
    where o.id = p_org and pl.slug = p_plan;

  -- 2. MODULES (produits du plan) -> entitlement porteur de capacite.
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

  -- 2bis. Sous-fonctionnalites produit porteuses de capacite (catalogue Hub, cote modules).
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

  -- 3. QUOTAS du plan.
  insert into public.org_entitlements (organization_id, key, limit_value, pricing_kind, source, granted_at)
  select p_org, pq.quota_key, pq.limit_value, 'none', 'plan:' || p_plan, now()
  from public.plan_quotas pq
  where pq.plan_slug = p_plan
  on conflict (organization_id, key) do update
    set limit_value = excluded.limit_value, source = excluded.source, updated_at = now()
  where public.org_entitlements.source <> 'manual';

  -- 4. Produit d'accueil du plan.
  update public.organizations o
    set home_product = pl.home_product
    from public.plans pl
    where o.id = p_org and pl.slug = p_plan and pl.home_product is not null;

  -- 5. Retire les entitlements d'un plan PRECEDENT (preserve manual, provisioning, bridge
  --    et le plan courant). Le trigger trg_entitlement_refresh reprojette les capacites.
  delete from public.org_entitlements
   where organization_id = p_org
     and source like 'plan:%'
     and source <> 'plan:' || p_plan;
end $$;
revoke all on function public.apply_plan(uuid, text) from public;

-- apply_entitlement_template devient un wrapper : les appelants existants (edge
-- admin-entitlement action apply_template, console Templates) posent desormais aussi le
-- plan_id et beneficient du retrait des lignes de l'ancien plan.
create or replace function public.apply_entitlement_template(p_org uuid, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.apply_plan(p_org, p_plan);
end $$;
