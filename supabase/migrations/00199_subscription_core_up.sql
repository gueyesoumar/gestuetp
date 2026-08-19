-- Migration 00199 (UP) : couche ② abonnement — cœur + backfill (RFC 0006, Phase 2)
--
-- Crée les tables d'abonnement (org × produit) et de features à la carte, + les
-- colonnes commerciales sur organizations (remise globale, produit d'accueil), puis
-- BACKFILL depuis l'existant (organization_capabilities + editions + plan_id) via le
-- pont product_capability / product_features.capability (mig 00198).
--
-- DORMANT : rien ne LIT encore ces tables (le gating reste sur organization_capabilities
-- jusqu'à la bascule P3). ZÉRO changement de comportement runtime. Écritures :
-- service_role (backfill ici ; console admin en P4). Lecture : own-org staff + is_aal2.

-- 1. Statut d'abonnement -------------------------------------------------------
do $$ begin
  create type public.subscription_status as enum ('active','trial','suspended');
exception when duplicate_object then null; end $$;

-- 2. Abonnements (une ligne par org × produit) ---------------------------------
create table if not exists public.org_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  product_key      text not null references public.products(key),
  status           public.subscription_status not null default 'active',
  trial_ends_at    timestamptz,
  unit_price_eur   numeric(10,2) not null default 0,          -- prix figé à la souscription
  discount_pct     smallint not null default 0 check (discount_pct between 0 and 100),  -- remise par produit (10.3)
  plan_slug        text,                                       -- plan d'origine (bundle) si applicable
  started_at       timestamptz not null default now(),
  suspended_at     timestamptz,
  created_by       uuid references public.users(id) on delete set null,
  updated_at       timestamptz not null default now(),
  unique (organization_id, product_key)
);
comment on table public.org_subscriptions is
  'Abonnements org × produit (RFC 0006 §4.2). Source commerciale ; le gating en dérive (P3). Écritures service_role.';
create index if not exists idx_org_sub_org on public.org_subscriptions(organization_id);

-- 3. Features à la carte -------------------------------------------------------
create table if not exists public.org_subscription_features (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.org_subscriptions(id) on delete cascade,
  feature_key     text not null,
  unit_price_eur  numeric(10,2) not null default 0,
  unique (subscription_id, feature_key)
);
comment on table public.org_subscription_features is
  'Fonctionnalités à la carte activées sur un abonnement (RFC 0006 §4.2). Les features core sont implicites (non stockées ici).';
create index if not exists idx_org_sub_feat_sub on public.org_subscription_features(subscription_id);

-- 4. Colonnes commerciales sur organizations -----------------------------------
alter table public.organizations
  add column if not exists discount_pct smallint not null default 0 check (discount_pct between 0 and 100),  -- remise globale (10.3)
  add column if not exists home_product text references public.products(key);                                 -- produit d'accueil (③)

-- 5. RLS : own-org staff (lecture/écriture via service_role hors RLS) + is_aal2 --
alter table public.org_subscriptions enable row level security;
drop policy if exists "os_org" on public.org_subscriptions;
create policy "os_org" on public.org_subscriptions for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());
drop policy if exists "os_aal2" on public.org_subscriptions;
create policy "os_aal2" on public.org_subscriptions as restrictive for all to authenticated using (public.is_aal2());

alter table public.org_subscription_features enable row level security;
drop policy if exists "osf_org" on public.org_subscription_features;
create policy "osf_org" on public.org_subscription_features for all to authenticated
  using (exists (select 1 from public.org_subscriptions s
                 where s.id = subscription_id
                   and s.organization_id = public.get_my_organization_id()
                   and not public.is_client_role()))
  with check (exists (select 1 from public.org_subscriptions s
                      where s.id = subscription_id
                        and s.organization_id = public.get_my_organization_id()
                        and not public.is_client_role()));
drop policy if exists "osf_aal2" on public.org_subscription_features;
create policy "osf_aal2" on public.org_subscription_features as restrictive for all to authenticated using (public.is_aal2());

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. BACKFILL (idempotent) — mapping Annexe A via les ponts de 00198
-- ══════════════════════════════════════════════════════════════════════════════

-- 6a. Produits : chaque capacité produit (product_capability) → un abonnement.
--     Statut : disabled → suspended, sinon identique.
insert into public.org_subscriptions (organization_id, product_key, status)
select oc.org_id, pc.product_key,
       (case oc.status::text when 'disabled' then 'suspended' else oc.status::text end)::public.subscription_status
from public.organization_capabilities oc
join public.product_capability pc on pc.capability = oc.capability
on conflict (organization_id, product_key) do nothing;

-- 6b. Features : capacités mappées à une feature NON-core (ex. incidents, measures
--     → produit regul) → org_subscription_features.
insert into public.org_subscription_features (subscription_id, feature_key)
select s.id, pf.key
from public.organization_capabilities oc
join public.product_features pf on pf.capability = oc.capability and pf.is_core = false
join public.org_subscriptions s on s.organization_id = oc.org_id and s.product_key = pf.product_key
on conflict (subscription_id, feature_key) do nothing;

-- 6c. Produit d'accueil : regul si abonnement regul non suspendu, sinon comply.
update public.organizations o set home_product = case
    when exists (select 1 from public.org_subscriptions s
                 where s.organization_id = o.id and s.product_key = 'regul' and s.status <> 'suspended') then 'regul'
    when exists (select 1 from public.org_subscriptions s
                 where s.organization_id = o.id and s.product_key = 'comply' and s.status <> 'suspended') then 'comply'
    else o.home_product end
where o.home_product is null;

-- 6d. Traçabilité du plan d'origine (plan_id → plan_slug sur les abonnements).
update public.org_subscriptions s set plan_slug = p.slug
from public.organizations o
join public.plans p on p.id = o.plan_id
where s.organization_id = o.id and s.plan_slug is null and o.plan_id is not null;

-- 7. Diff d'invariance (contrôle avant P3) : capacités actives SANS abonnement/feature
--    dérivé (hors 'comply' core & groupe, attendues implicites). Purement informatif.
do $$
declare v_unmapped int;
begin
  select count(*) into v_unmapped
  from public.organization_capabilities oc
  where oc.status <> 'disabled'
    and not exists (select 1 from public.product_capability pc where pc.capability = oc.capability)
    and not exists (select 1 from public.product_features pf where pf.capability = oc.capability);
  raise notice '[00199] Backfill abonnements terminé. Capacités actives non mappées (attendu 0) : %', v_unmapped;
end $$;
