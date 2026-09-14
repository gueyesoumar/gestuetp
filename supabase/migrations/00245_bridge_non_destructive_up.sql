-- Migration 00245 (UP) : pont non-destructif (RFC 0008 / INC 5a)
--
-- Le pont (INC 3) faisait DELETE-all + réinsertion → il écraserait toute surcharge
-- admin. Réécriture en UPSERT qui partitionne les colonnes :
--   - « abonnement » (le pont possède) : existence, status, trial_ends_at, capability, source
--   - « admin » (préservées après création) : pricing_kind, price_amount, price_unit,
--     included_qty, discount_pct, enforcement, limit_value
-- Les lignes source='manual' ne sont JAMAIS touchées (octroyées par admin-entitlement).
-- Les triggers et refresh_org_capabilities restent ceux d'INC 3.

-- Lignes produit/feature d'une org, en préservant les surcharges admin.
create or replace function public.sync_entitlements_from_subscription(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- PRODUITS
  insert into public.org_entitlements
    (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, discount_pct, source, capability, granted_at)
  select s.organization_id, s.product_key, s.status, s.trial_ends_at,
         case when s.unit_price > 0 then 'flat' else 'none' end,
         nullif(s.unit_price, 0),
         case when s.unit_price > 0 then 'month' end,
         s.discount_pct,
         coalesce('plan:' || s.plan_slug, 'subscription'),
         (select pc.capability from public.product_capability pc
          where pc.product_key = s.product_key order by pc.capability limit 1),
         s.started_at
  from public.org_subscriptions s
  where s.organization_id = p_org
  on conflict (organization_id, key) do update
    set status = excluded.status,
        trial_ends_at = excluded.trial_ends_at,
        capability = excluded.capability,
        source = excluded.source,
        updated_at = now()
  where public.org_entitlements.source <> 'manual';   -- ne jamais écraser un droit manuel

  -- FEATURES
  insert into public.org_entitlements
    (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select s.organization_id, f.feature_key, s.status, s.trial_ends_at,
         case when f.unit_price > 0 then 'flat' else 'none' end,
         nullif(f.unit_price, 0),
         case when f.unit_price > 0 then 'month' end,
         'subscription',
         (select pf.capability from public.product_features pf
          where pf.product_key = s.product_key and pf.key = f.feature_key),
         s.started_at
  from public.org_subscription_features f
  join public.org_subscriptions s on s.id = f.subscription_id
  where s.organization_id = p_org
  on conflict (organization_id, key) do update
    set status = excluded.status,
        trial_ends_at = excluded.trial_ends_at,
        capability = excluded.capability,
        source = excluded.source,
        updated_at = now()
  where public.org_entitlements.source <> 'manual';

  -- Suppression ciblée : lignes issues d'abonnement dont la source a disparu.
  -- Ne touche jamais les quotas (users/missions) ni les droits manuels.
  delete from public.org_entitlements e
  where e.organization_id = p_org
    and e.key not in ('users', 'missions')
    and e.source <> 'manual'
    and not exists (select 1 from public.org_subscriptions s
                    where s.organization_id = p_org and s.product_key = e.key)
    and not exists (select 1 from public.org_subscription_features f
                    join public.org_subscriptions s on s.id = f.subscription_id
                    where s.organization_id = p_org and f.feature_key = e.key);

  perform public.refresh_org_capabilities(p_org);
end $$;

-- Lignes quota d'une org, sans écraser une limite passée en source='manual'.
create or replace function public.sync_entitlements_quota(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.org_entitlements
  where organization_id = p_org and key in ('users', 'missions') and source <> 'manual';

  insert into public.org_entitlements (organization_id, key, limit_value, pricing_kind, source, granted_at)
  select p_org, q.quota_key,
         coalesce(
           (select ql.limit_value from public.org_quota_limits ql
            where ql.organization_id = p_org and ql.quota_key = q.quota_key),
           case q.quota_key when 'users' then p.max_users when 'missions' then p.max_missions end
         ),
         'none', 'sync', now()
  from (values ('users'), ('missions')) as q(quota_key)
  left join public.organizations o on o.id = p_org
  left join public.plans p on p.id = o.plan_id
  where (o.plan_id is not null or exists (select 1 from public.org_quota_limits ql where ql.organization_id = p_org))
    and not exists (select 1 from public.org_entitlements e
                    where e.organization_id = p_org and e.key = q.quota_key and e.source = 'manual')
  on conflict (organization_id, key) do nothing;
end $$;
