-- Migration 00201 (UP) : plans en bundles (RFC 0006, Phase 2, chantier D) — additif/dormant
--
-- Ajoute la SÉMANTIQUE de bundle à un plan : quels PRODUITS et quelles FEATURES il
-- octroie, + son produit d'accueil. Sert à la console P4 pour créer les abonnements
-- d'un coup à l'application d'un plan.
--
-- IMPORTANT : n'affecte PAS le système existant `plan_features(plan_id, flag_id)` +
-- `feature_flags`, qui reste le mécanisme de BASCULES TECHNIQUES (kill-switch, A/B)
-- via useFeatureFlag — orthogonal à l'abonnement commercial (RFC 0006 Annexe B). Les
-- nouvelles tables portent donc un nom distinct (`plan_bundle_features`).
--
-- DORMANT : rien ne lit ces tables avant la console P4. L'UI /admin/plans existante
-- reste inchangée et fonctionnelle. Écritures service_role ; lecture authenticated.

-- 1. Produit d'accueil d'un bundle ---------------------------------------------
alter table public.plans
  add column if not exists home_product text references public.products(key);

-- 2. Produits octroyés par un bundle -------------------------------------------
create table if not exists public.plan_products (
  plan_slug   text not null references public.plans(slug) on delete cascade,
  product_key text not null references public.products(key),
  primary key (plan_slug, product_key)
);
comment on table public.plan_products is
  'Produits octroyés par un plan-bundle (RFC 0006 §4.2). Consommé par la console P4 pour créer les org_subscriptions.';

-- 3. Features octroyées par un bundle (par produit) ----------------------------
create table if not exists public.plan_bundle_features (
  plan_slug   text not null references public.plans(slug) on delete cascade,
  product_key text not null references public.products(key),
  feature_key text not null,
  primary key (plan_slug, product_key, feature_key)
);
comment on table public.plan_bundle_features is
  'Features octroyées par un plan-bundle (RFC 0006 §4.2). Distinct de plan_features(plan_id,flag_id) = flags techniques (Annexe B).';

-- 4. Seed : mapping des plans EXISTANTS vers produits/features ------------------
update public.plans set home_product = 'comply' where slug in ('decouverte','pro') and home_product is null;
update public.plans set home_product = 'regul'  where slug = 'regulateur' and home_product is null;

insert into public.plan_products (plan_slug, product_key) values
  ('decouverte', 'comply'),
  ('pro',        'comply'),
  ('regulateur', 'regul')
on conflict do nothing;

-- Features core des produits octroyés (implicites du produit).
insert into public.plan_bundle_features (plan_slug, product_key, feature_key)
select pp.plan_slug, pf.product_key, pf.key
from public.plan_products pp
join public.product_features pf on pf.product_key = pp.product_key and pf.is_core = true
on conflict do nothing;

-- Régulateur : ajoute les features non-core mesures / incidents / chaîne probante.
insert into public.plan_bundle_features (plan_slug, product_key, feature_key) values
  ('regulateur', 'regul', 'mesures'),
  ('regulateur', 'regul', 'incidents'),
  ('regulateur', 'regul', 'probatoire')
on conflict do nothing;

-- 5. RLS : lecture authenticated (catalogue), écritures service_role -----------
alter table public.plan_products enable row level security;
drop policy if exists plan_products_select_all on public.plan_products;
create policy plan_products_select_all on public.plan_products for select to authenticated using (true);

alter table public.plan_bundle_features enable row level security;
drop policy if exists plan_bundle_features_select_all on public.plan_bundle_features;
create policy plan_bundle_features_select_all on public.plan_bundle_features for select to authenticated using (true);
