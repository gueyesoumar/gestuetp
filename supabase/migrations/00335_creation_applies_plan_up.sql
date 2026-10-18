-- 00335 - RFC 0018 Phase 3 : la création d'organisation applique le plan.
--
-- P3-a B : on retire le trigger qui FORÇAIT « comply » sur toute insertion d'org, et on
-- provisionne EXPLICITEMENT depuis chaque parcours de création :
--   - cabinets (admin-create-cabinet) : provision_org_baseline + apply_plan(plan choisi) ;
--   - clients/assujettis (create-client) et entités/filiales (manage-entity) :
--     provision_org_baseline (socle comply, iso-comportement avec l'ancien trigger).
-- P3-b : get_plan_contents(slug) alimente l'aperçu du wizard.

-- Socle explicite (= ancien corps du trigger) : comply + ses features core, idempotent.
create or replace function public.provision_org_baseline(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_entitlements
    (organization_id, key, status, pricing_kind, price_amount, price_unit, source, capability, granted_at)
  select p_org, 'comply', 'active',
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
  select p_org, pf.key, 'active',
         case when pf.monthly_price > 0 then 'flat' else 'none' end,
         nullif(pf.monthly_price, 0),
         case when pf.monthly_price > 0 then 'month' end,
         'provisioning', pf.capability, now()
  from public.product_features pf where pf.product_key = 'comply' and pf.is_core
  on conflict (organization_id, key) do nothing;

  perform public.refresh_org_capabilities(p_org);
end $$;
revoke all on function public.provision_org_baseline(uuid) from public;

-- Retire le trigger qui forçait « comply » sur CHAQUE insert d'org (00164). Le socle est
-- désormais posé explicitement par les edges de création. La fonction trigger reste (dormante).
drop trigger if exists trg_sync_org_capabilities on public.organizations;

-- Aperçu d'un plan pour le wizard de création (lecture seule du catalogue).
create or replace function public.get_plan_contents(p_plan text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'modules', coalesce((select jsonb_agg(pr.name order by pr.name)
       from public.plan_products pp join public.products pr on pr.key = pp.product_key
       where pp.plan_slug = p_plan), '[]'::jsonb),
    'features', coalesce((select jsonb_agg(ff.name order by ff.name)
       from public.plan_features plf
       join public.plans pl on pl.id = plf.plan_id
       join public.feature_flags ff on ff.id = plf.flag_id
       where pl.slug = p_plan), '[]'::jsonb),
    'quotas', coalesce((select jsonb_agg(jsonb_build_object('key', pq.quota_key, 'limit', pq.limit_value) order by pq.quota_key)
       from public.plan_quotas pq where pq.plan_slug = p_plan), '[]'::jsonb)
  );
$$;
revoke all on function public.get_plan_contents(text) from public;
grant execute on function public.get_plan_contents(text) to authenticated;
