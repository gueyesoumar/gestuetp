-- Migration 00241 (UP) : fondation entitlement (RFC 0008 P1 / INC 2)
--
-- Crée la table pivot org_entitlements, la remplit depuis les DEUX systèmes vivants
-- (abonnements NEW + quotas plans), et fournit une garde d'invariance. ADDITIF ET
-- DORMANT : aucun code (front/edge/RLS/trigger) ne lit encore cette table → zéro
-- changement de comportement. La bascule du read-path = INC 3 (P2).
--
-- Choix de sûreté du backfill :
--   - enforcement='soft' partout (= la réalité cosmétique actuelle) ;
--   - pricing_kind='flat'/month quand un prix existe (= sémantique MRR mensuelle
--     actuelle de org_mrr) ;
--   - capability posée sur chaque ligne produit/feature (product_capability 1:1
--     aujourd'hui ; product_features.capability pour les features) → projection sans
--     ambiguïté et invariance vérifiable.

-- 1. Table ----------------------------------------------------------------------
create table if not exists public.org_entitlements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  key              text not null,                       -- produit, feature, ou quota (users/missions)
  status           public.subscription_status not null default 'active',  -- enum active|trial|suspended (00199)
  trial_ends_at    timestamptz,
  limit_value      int,                                 -- null = booléen (droit pur) ; sinon plafond
  pricing_kind     text not null default 'none' check (pricing_kind in ('none','flat','per_unit','metered')),
  price_amount     numeric(12,2),                       -- FCFA (XOF) ; null = inclus/gratuit
  price_unit       text check (price_unit in ('month','year','seat','mission','assujetti','client','subsidiary','credit')),
  included_qty     int,                                 -- allocation incluse avant overage (metered)
  discount_pct     smallint not null default 0 check (discount_pct between 0 and 100),
  enforcement      text not null default 'soft' check (enforcement in ('soft','hard')),
  source           text,                                -- 'plan:<slug>' | 'backfill' | 'manual'
  capability       public.org_capability,               -- pont projection (null pour les quotas)
  granted_by       uuid references public.users(id) on delete set null,
  granted_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, key)
);
comment on table public.org_entitlements is
  'RFC 0008 : primitif unique d''entitlement (accès+limite+prix+gate+source). DORMANT en P1 ; source de vérité en P2 (INC 3).';
create index if not exists idx_org_entitlements_org on public.org_entitlements(organization_id);
create index if not exists idx_org_entitlements_cap on public.org_entitlements(capability) where capability is not null;

-- 2. RLS : lecture own-org staff OU superadmin ; écritures service_role only ------
alter table public.org_entitlements enable row level security;

drop policy if exists org_entitlements_select on public.org_entitlements;
create policy org_entitlements_select on public.org_entitlements
  for select to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role());

drop policy if exists org_entitlements_select_platform on public.org_entitlements;
create policy org_entitlements_select_platform on public.org_entitlements
  for select to authenticated
  using (public.is_platform_owner());

-- Garde AAL2 (patron Risk 00184 / Policy 00190).
drop policy if exists org_entitlements_aal2 on public.org_entitlements;
create policy org_entitlements_aal2 on public.org_entitlements
  as restrictive for all to authenticated
  using (public.is_aal2());
-- (Aucune policy insert/update/delete pour authenticated → seul service_role écrit.)

-- 3. Résolveur d'accès (dormant : appelé par les edges en INC 3) -----------------
create or replace function public.org_has_entitlement(p_org uuid, p_key text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  -- Garde : superadmin, own-org, ou contexte serveur (service_role).
  if not (public.is_platform_owner()
          or p_org = public.get_my_organization_id()
          or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return exists (
    select 1 from public.org_entitlements e
    where e.organization_id = p_org and e.key = p_key
      and (e.status = 'active'
           or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
  );
end; $$;
comment on function public.org_has_entitlement(uuid, text) is
  'RFC 0008 : true si l''org possède le droit (actif ou essai non expiré). Garde own-org/superadmin/service.';
grant execute on function public.org_has_entitlement(uuid, text) to authenticated;

-- 4. Garde d'invariance : projection depuis org_entitlements == capacités actuelles
create or replace function public.verify_entitlement_invariance()
returns table(org_id uuid, capability public.org_capability, in_entitlements boolean, in_capabilities boolean)
language sql stable security definer set search_path = public as $$
  with proj as (
    select e.organization_id as org_id, e.capability
    from public.org_entitlements e
    where e.capability is not null
      and (e.status = 'active'
           or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
    group by e.organization_id, e.capability
  ),
  cur as (
    select oc.org_id, oc.capability
    from public.organization_capabilities oc
    where oc.status <> 'disabled'
  )
  select coalesce(p.org_id, c.org_id),
         coalesce(p.capability, c.capability),
         p.capability is not null,
         c.capability is not null
  from proj p
  full outer join cur c on p.org_id = c.org_id and p.capability = c.capability
  where p.capability is null or c.capability is null;
$$;
comment on function public.verify_entitlement_invariance() is
  'RFC 0008 : renvoie les écarts entre la projection des entitlements et organization_capabilities (attendu : 0 ligne).';

-- 5. Backfill depuis les deux systèmes ------------------------------------------
-- 5a. Produits (abonnements NEW)
insert into public.org_entitlements
  (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, discount_pct, source, capability, granted_at)
select s.organization_id, s.product_key, s.status, s.trial_ends_at,
       case when s.unit_price > 0 then 'flat' else 'none' end,
       nullif(s.unit_price, 0),
       case when s.unit_price > 0 then 'month' end,
       s.discount_pct,
       coalesce('plan:' || s.plan_slug, 'backfill'),
       (select pc.capability from public.product_capability pc
        where pc.product_key = s.product_key order by pc.capability limit 1),
       s.started_at
from public.org_subscriptions s
on conflict (organization_id, key) do nothing;

-- 5b. Fonctionnalités (features d'abonnement)
insert into public.org_entitlements
  (organization_id, key, status, trial_ends_at, pricing_kind, price_amount, price_unit, source, capability, granted_at)
select s.organization_id, f.feature_key, s.status, s.trial_ends_at,
       case when f.unit_price > 0 then 'flat' else 'none' end,
       nullif(f.unit_price, 0),
       case when f.unit_price > 0 then 'month' end,
       'backfill',
       (select pf.capability from public.product_features pf
        where pf.product_key = s.product_key and pf.key = f.feature_key),
       s.started_at
from public.org_subscription_features f
join public.org_subscriptions s on s.id = f.subscription_id
on conflict (organization_id, key) do nothing;

-- 5c. Quotas (limite effective : org_quota_limits, repli plans.max_*)
insert into public.org_entitlements
  (organization_id, key, limit_value, pricing_kind, source, granted_at)
select o.id, q.quota_key,
       coalesce(
         (select ql.limit_value from public.org_quota_limits ql
          where ql.organization_id = o.id and ql.quota_key = q.quota_key),
         case q.quota_key when 'users' then p.max_users when 'missions' then p.max_missions end
       ),
       'none', 'backfill', now()
from public.organizations o
cross join (values ('users'), ('missions')) as q(quota_key)
left join public.plans p on p.id = o.plan_id
where o.plan_id is not null
   or exists (select 1 from public.org_quota_limits ql where ql.organization_id = o.id)
on conflict (organization_id, key) do nothing;

-- 6. Contrôle d'invariance (non fatal — table dormante ; bloquant AVANT INC 3) ---
do $$
declare v_diff int;
begin
  select count(*) into v_diff from public.verify_entitlement_invariance();
  raise notice '[00241] Invariance entitlements <-> capacites : % ecart(s) (attendu 0)', v_diff;
end $$;
