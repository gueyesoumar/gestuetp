-- Migration 00198 (UP) : catalogue produits (RFC 0006, Phase 1 — couche ① Catalogue)
--
-- Crée le catalogue de PRODUITS et de FONCTIONNALITÉS comme DONNÉE, source unique
-- destinée à remplacer l'enum org_capability figé + le tableau HUB_PRODUCTS en dur
-- (src/lib/hubProducts.ts). Décision 10.1 : hubProducts.ts fait foi pour les couleurs.
--
-- ADDITIF et DORMANT : aucun gating n'est branché ici. Les colonnes de « pont » vers
-- l'enum (product_features.capability, product_capability) sont peuplées mais NON
-- consommées — elles serviront au résolveur d'entitlement en P3. ZÉRO changement de
-- comportement runtime : seul le Hub lit désormais ce catalogue (mêmes valeurs).
--
-- Écritures : service_role uniquement (aucune policy write). Lecture : authenticated
-- (catalogue non sensible : libellés + couleurs).

-- 1. Produits ------------------------------------------------------------------
create table if not exists public.products (
  key              text primary key,          -- slug stable (comply, regul, risk, …)
  name             text not null,             -- nom d'affichage (identifiant Hub actuel)
  title            text not null,             -- baseline
  description      text not null,
  accent_color     text not null,             -- couleur signature (source unique, ex-hubProducts)
  badge            text not null default '',  -- libellé de repli hors souscription (Actif/Bientôt/2027)
  is_home_eligible boolean not null default false,  -- peut être produit d'accueil (Comply, Regul)
  is_published     boolean not null default false,  -- false = produit non encore livré
  active_default   boolean not null default false,  -- valeur `active` de base côté Hub (avant surcharge par souscription)
  monthly_price_eur numeric(10,2) not null default 0,  -- prix socle (réel en P2)
  sort_order       int not null default 0
);
comment on table public.products is
  'Catalogue produits Gëstu (RFC 0006 §4.1, couche ①). Source unique des libellés/couleurs produits (remplace HUB_PRODUCTS). DORMANT en P1 : aucun gating.';

insert into public.products
  (key, name, title, description, accent_color, badge, is_home_eligible, is_published, active_default, sort_order) values
  ('comply', 'Comply', 'Conformité & Audit SI',
     'Audits multi-référentiels, évaluations de contrôles, rapports automatisés.',
     '#40916C', 'Actif', true, true, true, 1),
  ('regul', 'Regul', 'Supervision & Régulation',
     'Pour les organes de régulation : parc d''assujettis, missions de contrôle, mesures graduées, traçabilité probante.',
     '#D4A843', 'Actif', true, true, true, 2),
  ('risk', 'Risk', 'Gestion des Risques',
     'Cartographie des risques SI, scénarios de menaces, plans de traitement.',
     '#E07A5F', 'Bientôt', false, true, false, 3),
  ('policy', 'Policy', 'Politiques & Gouvernance',
     'Rédaction, validation et diffusion des politiques de sécurité.',
     '#7B68EE', 'Bientôt', false, true, false, 4),
  ('awareness', 'Awareness', 'Sensibilisation',
     'Campagnes de sensibilisation, quiz, suivi de la maturité sécurité.',
     '#E67E22', '2027', false, false, false, 5),
  ('privacy', 'Data Privacy', 'Protection des Données',
     'Registre des traitements, AIPD, conformité RGPD et loi sénégalaise.',
     '#3B82F6', '2027', false, false, false, 6),
  ('quality', 'Quality', 'Qualité & Amélioration',
     'Gestion des non-conformités, actions correctives, amélioration continue.',
     '#0891B2', '2027', false, false, false, 7)
on conflict (key) do update set
  name = excluded.name, title = excluded.title, description = excluded.description,
  accent_color = excluded.accent_color, badge = excluded.badge,
  is_home_eligible = excluded.is_home_eligible, is_published = excluded.is_published,
  active_default = excluded.active_default, sort_order = excluded.sort_order;

-- 2. Fonctionnalités par produit -----------------------------------------------
--    `capability` = pont de compat vers l'enum (DORMANT, affiné en P3).
create table if not exists public.product_features (
  id                uuid primary key default gen_random_uuid(),
  product_key       text not null references public.products(key) on delete cascade,
  key               text not null,
  label             text not null,
  is_core           boolean not null default false,   -- inclus d'office à la souscription du produit
  monthly_price_eur numeric(10,2) not null default 0, -- supplément add-on
  capability        public.org_capability,            -- pont vers l'enum (NULL = pas de capacité dédiée)
  sort_order        int not null default 0,
  unique (product_key, key)
);
comment on table public.product_features is
  'Fonctionnalités par produit (RFC 0006 §4.1). is_core = inclus d''office ; capability = pont dormant vers org_capability (P3).';

insert into public.product_features
  (product_key, key, label, is_core, monthly_price_eur, capability, sort_order) values
  -- Comply
  ('comply', 'missions',     'Missions & évaluations',      true,  0, 'comply',      1),
  ('comply', 'referentiels', 'Référentiels',                true,  0, 'comply',      2),
  ('comply', 'portail',      'Portail client',              true,  0, 'comply',      3),
  ('comply', 'groupe',       'Module Groupe (filiales)',    false, 0, null,          4),
  -- Regul
  ('regul',  'assujettis',   'Parc d''assujettis',          true,  0, 'supervision', 1),
  ('regul',  'controles',    'Missions de contrôle',        true,  0, 'supervision', 2),
  ('regul',  'mesures',      'Mesures graduées',            false, 0, 'measures',    3),
  ('regul',  'incidents',    'Incidents',                   false, 0, 'incidents',   4),
  ('regul',  'probatoire',   'Chaîne probante',             false, 0, null,          5),
  -- Risk
  ('risk',   'registre',     'Registre EBIOS',              true,  0, 'risk',        1),
  ('risk',   'bowtie',       'Nœud papillon',               true,  0, 'risk',        2),
  ('risk',   'simulateur',   'Simulateur « et si »',        false, 0, null,          3),
  -- Policy
  ('policy', 'registre',     'Registre & cycle de vie',     true,  0, 'policy',      1),
  ('policy', 'attestations', 'Attestations',                false, 0, null,          2),
  ('policy', 'couverture',   'Couverture référentiel',      false, 0, null,          3),
  ('policy', 'ai',           'Rédaction IA',                false, 0, null,          4)
on conflict (product_key, key) do update set
  label = excluded.label, is_core = excluded.is_core,
  monthly_price_eur = excluded.monthly_price_eur, capability = excluded.capability,
  sort_order = excluded.sort_order;

create index if not exists idx_product_features_product on public.product_features(product_key);

-- 3. Pont produit → capacité (DORMANT, affiné en P3) ---------------------------
create table if not exists public.product_capability (
  product_key text not null references public.products(key) on delete cascade,
  capability  public.org_capability not null,
  primary key (product_key, capability)
);
comment on table public.product_capability is
  'Pont produit → org_capability (RFC 0006 §5). DORMANT en P1 : base de régénération de organization_capabilities en P3.';

insert into public.product_capability (product_key, capability) values
  ('comply', 'comply'),
  ('regul',  'supervision'),
  ('risk',   'risk'),
  ('policy', 'policy'),
  ('privacy','privacy'),
  ('awareness','awareness')
on conflict do nothing;

-- 4. RLS : lecture authenticated (non sensible), écritures service_role only ----
alter table public.products enable row level security;
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products for select to authenticated using (true);

alter table public.product_features enable row level security;
drop policy if exists product_features_select_all on public.product_features;
create policy product_features_select_all on public.product_features for select to authenticated using (true);

alter table public.product_capability enable row level security;
drop policy if exists product_capability_select_all on public.product_capability;
create policy product_capability_select_all on public.product_capability for select to authenticated using (true);
