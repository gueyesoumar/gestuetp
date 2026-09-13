# RFC 0008 — Entitlement unique (plans, fonctionnalités, prix, accès en un seul objet)

> Statut : **proposition** (cadrage, avant tout code) — maquette de vision validée.
> Dérive de : RFC 0001 (graphe d'organisation), RFC 0002 (capacités + vocab par org), RFC 0006 (modèle d'abonnement).
> Remplace : la **cible** à 4 couches de la RFC 0006 (catalogue → abonnement → entitlement → vocab). Conserve et prolonge ce que la 0006 a **déjà livré** (mig 00198–00207).
> Maquette de vision : artifact « Console d'abonnement Gëstu » — https://claude.ai/code/artifact/41594cba-7193-4492-85fb-f9e9a73e1167

---

## 1. Thèse

Aujourd'hui, savoir **ce qu'une organisation a le droit d'utiliser** et **ce qu'elle paie** se décide dans **deux systèmes vivants qui ne se parlent pas** — l'ancien (plans) n'a jamais été retiré quand le nouveau (abonnements) a été branché. Résultat : le chiffre d'affaires est calculé de trois façons différentes, le gating des modules et celui des fonctionnalités reposent sur des sources distinctes, les jauges de quota mentent, et **suspendre un client ne coupe que l'interface** — pas l'accès réel.

**Cette RFC remplace les deux systèmes par UN seul objet** : `org_entitlements`. Une ligne = un droit, et **tout ce qui concerne ce droit tient sur la ligne** : est-il actif, jusqu'où (booléen ou plafond), à quel prix (unité pluggable), est-il réellement bloqué côté serveur (souple/dur), et d'où il vient (template/manuel). Le chiffre d'affaires, le gating et les quotas **dérivent tous de cet objet unique**.

Analogie : une facture de téléphone. Une ligne « forfait », une ligne « data », une ligne « option ». Sur chaque ligne : actif ou non, consommation, prix. Aucune autre liste à croiser.

---

## 2. Constat (état réel du code)

Audit du 2026-09-13. **Deux générations de mécanismes coexistent en production**, sans pont entre elles :

| | **ANCIEN** — `plans` + `organizations.plan_id` + `plan_features` + `plan_quotas` | **NOUVEAU** — `products` + `org_subscriptions` → projection |
|---|---|---|
| Gating **modules** | — | ✅ `organization_capabilities` (projection, mig `00206`) → `hasCapability` |
| **Feature flags** | ✅ `useFeatureFlag.ts` lit `plan_features(plan_id)` | ❌ `plan_bundle_features` (`00201`) **dormante** |
| **Quotas UI** | ✅ `useMyCabinetQuotas.ts` lit `plans.max_*` en direct | ❌ ignore `org_quota_limits` (`00200`) |
| **MRR** | ✅ `admin-stats/index.ts:44` : `Σ orgs × plans.monthly_price` | `org_mrr()` (`00202`) avec remises — **chiffre différent** |
| Création d'org | ✅ `admin-create-cabinet:85` assigne `plan_id` | pas d'abonnement créé au même endroit |

**Aucun pont** : changer l'abonnement d'une org ne touche pas son `plan_id`, et inversement. La RFC 0006 a été **livrée à moitié** — la bascule `00206` (projection) et le retrait des éditions `00207` ont eu lieu, mais l'ancien système continue d'alimenter feature-flags, jauges de quota, MRR du dashboard et création d'org. La 0006 a donc **ajouté un deuxième référentiel au lieu d'en unifier un seul** — exactement la maladie qu'elle voulait soigner, redistribuée.

Douleurs concrètes mesurables :

1. **MRR calculé à 3 endroits, formules divergentes** (`admin-stats` vs `org_mrr()` vs `platform_mrr()`). Le dashboard superadmin et la console d'abonnement ne peuvent pas coïncider. Le champ s'appelle encore `mrr_eur_estimated` alors que la devise de base est le **FCFA** (`00227`, ×655,957).
2. **Feature-flags décorrélés des abonnements** : une org peut avoir un abonnement riche et un `plan_id` pauvre (donc pas de flags), ou l'inverse.
3. **Jauges de quota fausses** : `useMyCabinetQuotas` lit `plans.max_*` et **ignore** toute surcharge `org_quota_limits`.
4. **Gating 100 % cosmétique** : aucun edge ne vérifie l'entitlement avant d'agir (`issue-measure`, `declare-incident` → grep = 0), aucune policy RLS ne lit `organization_capabilities`. Suspendre = cacher l'UI, l'API et la donnée restent ouvertes → **fuite de revenu**.
5. **Nommage mort** : le dossier `src/features/edition/` (EditionContext, useVocab…) parle encore d'« édition résolue au runtime » alors que l'édition est supprimée depuis `00207`.
6. **`types[]` sert encore de gate parallèle** aux capacités (`'platform' = ANY(types)`, `'cabinet' = ANY(types)`).

---

## 3. Le modèle cible : un seul objet

### 3.1 `org_entitlements` — la table pivot

Une ligne par (organisation, droit). **Tout est org-scoped, écritures `service_role` uniquement.**

```
org_entitlements(
  id                uuid pk,
  organization_id   uuid  → organizations(id) on delete cascade,
  key               text,                       -- 'comply'|'risk'|'policy'|'measures'|'incidents'
                                                --  |'group'|'portal'|'ai_credits'|'seats'|'missions'…
  status            text  check(active|trial|suspended)  default 'active',
  trial_ends_at     timestamptz null,           -- si status='trial'

  -- ACCÈS / LIMITE
  limit_value       int   null,                 -- null = booléen (droit pur) ; sinon plafond (quota/métré)

  -- PRIX (dimension pluggable)
  pricing_kind      text  check(none|flat|per_unit|metered)  default 'none',
  price_amount      numeric(12,2) null,         -- montant FCFA (null = inclus/gratuit)
  price_unit        text  null,                 -- 'month'|'year'|'seat'|'mission'|'assujetti'
                                                --  |'client'|'subsidiary'|'credit'
  included_qty      int   null,                 -- allocation incluse avant overage (métré)
  discount_pct      smallint default 0 check(0..100),

  -- GATING
  enforcement       text  check(soft|hard)      default 'soft',

  -- TRAÇABILITÉ / COMPAT
  source            text,                       -- 'template:pro'|'manual'|'bundle'
  capability        org_capability null,        -- pont : régénère organization_capabilities (§4)
  granted_by        uuid  → users(id) null,
  granted_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique(organization_id, key)
)
```

Le principe : **la façon de facturer est une donnée (`pricing_kind` + `price_unit`), pas du code figé.** Ajouter « par mission », « par assujetti », « par crédit » = une valeur, sans développement.

### 3.2 Les types de facturation (`pricing_kind`)

| `pricing_kind` | Sens | Exemples d'`price_unit` | Statut |
|---|---|---|---|
| `none` | Inclus / gratuit | — | ✅ v1 |
| `flat` | Montant fixe par période | `month`, `year` | ✅ v1 |
| `per_unit` | `montant × quantité comptée` | `seat`, `mission`, `assujetti`, `client`, `subsidiary` | ✅ v1 |
| `metered` | Consommation avec allocation incluse + overage | `credit` | ✅ v1 |
| ~~`percentage`~~ | ~~taux × montant d'une mission~~ | — | ⛔ **reporté (§9.2)** |

Toutes les combinaisons v1 sont **de la pure configuration**, activables et **mixables** par org (un cabinet peut cumuler un `flat` Comply + `per_unit` Risk à la mission + `metered` IA). La quantité des `per_unit` est **déjà connue** de la plateforme (sièges, missions, entités) — rien à ajouter.

### 3.3 Templates (ex-plans)

`plans` (mig `00069`/`00121`) est **conservé comme en-tête de template**. Une nouvelle table décrit les lignes qu'un template sème :

```
plan_entitlements(
  plan_slug        text → plans(slug) on delete cascade,
  key              text,
  limit_value      int null,
  pricing_kind     text, price_amount numeric(12,2), price_unit text, included_qty int null,
  enforcement      text default 'soft',
  capability       org_capability null,
  pk(plan_slug, key)
)
```

**Appliquer un template** = copier ses `plan_entitlements` dans `org_entitlements` **en figeant les prix** (le template peut évoluer sans repricer rétroactivement). `plan_entitlements` remplace conceptuellement `plan_products` + `plan_bundle_features` + `plan_quotas`.

> **Feature flags TECHNIQUES conservés à part.** `feature_flags` (`00071`) + `feature_flag_overrides` + `useFeatureFlag` restent un système **orthogonal** : kill-switch d'incident, A/B, déploiement progressif. Un flag coupe une fonctionnalité en incident ; un entitlement décide d'un droit vendu. **Ne pas fusionner** (même distinction qu'en RFC 0006, Annexe B). Ce qui disparaît, c'est le **couplage commercial** `plan_features(plan_id)` : le gating de droit passe par `org_entitlements`, plus par le plan.

---

## 4. Comment tout dérive de l'objet unique

Un seul chemin de vérité, trois consommateurs :

- **Gating modules/features (③ compat)** — `organization_capabilities` **reste une projection** (comme `00206`, mais sourcée depuis `org_entitlements` au lieu de `org_subscriptions`). Un `refresh_org_capabilities(org)` (SECURITY DEFINER) régénère les capacités depuis les lignes `status ∈ (active, trial)` dont `capability` n'est pas null, avec **garde paresseuse** (un `trial` dont `trial_ends_at` est dépassé n'accorde rien). Trigger sur `org_entitlements`. **Zéro changement pour les appelants** (front `hasCapability`, RLS) pendant la transition.
- **Quotas** — `check_user_quota` / `check_mission_quota` (`00125`/`00200`) réécrites pour lire `org_entitlements.limit_value` des clés `seats` / `missions` (au lieu de `org_quota_limits` puis `plans.max_*`). `useMyCabinetQuotas` lit **la même** source. Exemption `platform` conservée.
- **MRR** — **une seule** primitive. `org_mrr(org)` somme les lignes récurrentes (`flat` + `per_unit × quantité`), applique la remise ligne puis la remise org, exclut `suspended`. `platform_mrr()` agrège. Le calcul de `admin-stats` est **supprimé**.

### 4.1 Gating souple vs dur (le point neuf)

`enforcement` est **décidé explicitement par droit** :

- **`soft`** — gate **UX seulement** : masque/nudge côté front (routes, nav, Hub). Aucune barrière serveur. Acceptable pour le confort, **jamais** pour un droit facturé.
- **`hard`** — vérifié **côté serveur** : l'edge appelle `require_entitlement(org, key)` (RPC SECURITY DEFINER `org_has_entitlement(org, key) → bool`, qui tient compte du statut et de l'expiration d'essai) **avant** d'exécuter. Suspendre = **couper l'API et la donnée**, pas l'écran.

Liste initiale des gates **durs** (portent de la valeur vendue) : `measures`, `incidents`, `ai_credits`, `risk`, `seats`, `missions`. Les edges concernées (`issue-measure`, `declare-incident`, `run-agent`/`smart-*`, création de mission, invitation de membre) ajoutent l'appel `require_entitlement`. Tout le reste reste `soft` par défaut.

> **Rappel sécurité (RFC 0002 §7) :** une capacité/entitlement est un **entitlement fonctionnel**, pas la frontière de cloisonnement. La RLS multi-tenant (`visible_target_ids`, `is_client_role`, `cp_*`) reste la barrière de **confidentialité**. `hard` ajoute une barrière **d'usage payant** par-dessus, il ne la remplace pas.

---

## 5. Sécurité (non négociable)

- **Écritures `service_role` uniquement** sur `org_entitlements` / `plan_entitlements` : toute mutation passe par une Edge admin (`admin-entitlement`), jamais par le client (pas d'élévation de privilège côté client — CLAUDE.md §3).
- **RLS** : `org_entitlements` lisible **own-org** (`organization_id = get_my_organization_id() and not is_client_role()`) + policy RESTRICTIVE `is_aal2()` (même patron que Risk `00184` / Policy `00190`). Un **client portail ne voit jamais** l'abonnement de son cabinet ([[project_client_rls_leak]]). `plan_entitlements` / `plans` lisibles par tout `authenticated` (non sensibles).
- **Pas de récursion RLS** : helpers (`get_my_organization_id`, `is_client_role`, `is_aal2`, `org_has_entitlement`) en SECURITY DEFINER ; aucune policy n'interroge sa propre table (CLAUDE.md §3).
- **MRR calculé serveur** (`org_mrr`/`platform_mrr` SECURITY DEFINER) — aucun prix ni agrégat de portefeuille recomposé côté client.
- **Historique inaltérable** : les actes d'abonnement passent par `activity_log` (chaîne de hash par org, append-only — [[project_audit_trail]]) avec des types dédiés (`entitlement.grant`, `.trial`, `.suspend`, `.reactivate`, `.remove`, `.template_apply`, `.discount`, `.enforcement_change`).

---

## 6. Migration de convergence (compat d'abord, pas de big-bang)

Le point dur : **fusionner les deux systèmes vivants sans rien casser**. La table cible se **remplit depuis les deux** avant que quoi que ce soit ne bascule.

**Backfill `org_entitlements` depuis les deux sources :**

| Source existante | Ligne(s) `org_entitlements` créée(s) |
|---|---|
| `org_subscriptions(product, status)` + `product_capability` | 1 ligne par produit (`key=product`, `capability`, `pricing_kind` depuis `products.monthly_price`) |
| `org_subscription_features(feature)` + `product_features.capability` | 1 ligne par feature activée |
| `organizations.plan_id` → `plans.max_users` / `max_missions` | lignes `seats` / `missions` (`limit_value`, `pricing_kind='none'`) |
| `org_quota_limits(org, quota_key, limit)` (surcharge effective) | écrase le `limit_value` correspondant |
| `capability_status` / `subscription_status` | `status` (mapping `disabled/… → suspended`) |
| `plan_features(plan_id, flag_id)` | **non migré** — reste dans le système de flags techniques |

**Garde d'invariance (obligatoire avant toute bascule)** : après backfill, la projection `organization_capabilities` régénérée depuis `org_entitlements` doit être **strictement identique** à l'état courant (diff = 0). Idem pour les quotas effectifs par org et le MRR par org (`org_mrr` nouveau == valeurs actuelles à limites/prix égaux).

---

## 7. Plan par phases

**P0 — Stop-the-bleed (indépendant, livrable tout de suite).**
Ne dépend pas de la convergence, corrige les mensonges actuels :
- unifier le MRR : supprimer le calcul de `admin-stats`, ne garder que `org_mrr`/`platform_mrr` ; renommer `mrr_eur_estimated` → `_xof` ;
- rebrancher `useMyCabinetQuotas` sur la couche effective (`org_quota_limits`, en attendant `org_entitlements`) ;
- nettoyer le nommage mort (`src/features/edition/` → `capabilities/`, commentaires « édition au runtime »).

**P1 — Table cible + backfill, additif/dormant.** Créer `org_entitlements` + `plan_entitlements` + `org_has_entitlement()` ; backfill depuis les deux systèmes (§6) ; **rien ne lit encore** `org_entitlements`. Diff d'invariance ✓.

**P2 — Bascule du read-path.** `refresh_org_capabilities()` sourcé depuis `org_entitlements` ; `check_user_quota`/`check_mission_quota` + `useMyCabinetQuotas` + front lisent `org_entitlements` ; `org_mrr` réécrit dessus. Prouver l'invariance à chaque site.

**P3 — Enforcement serveur.** Ajouter `require_entitlement()` aux edges des gates **durs** (§4.1). Décider et figer la liste soft/hard.

**P4 — Console unifiée (maquette).** Edge `admin-entitlement` (service_role) + console d'abonnement (artifact 41594cba) ; historique câblé sur `activity_log`. Fusionne/retire `admin-plans`, `admin-subscription`, `AdminOrgModulesCard`.

**P5 — Nettoyage (différé, non bloquant).** Transformer `org_subscriptions`/`org_subscription_features`/`org_quota_limits`/`plan_products`/`plan_bundle_features`/`plan_quotas` en vues ou les supprimer, chaque retrait derrière vérification qu'aucun appelant ne subsiste. `organization_capabilities` peut devenir une vue.

Migrations à partir de ~`00240`, convention `NNNNN_nom_up/_down.sql`. Flux `feat/entitlement-model → staging → PR main` ([[feedback_branch_flow]]) ; CI Deploy applique migrations + edges (gate prod).

---

## 8. Rétro-compatibilité & rollback

- **Compat** garantie par §4 : tout le gating existant continue de lire `organization_capabilities` (projection). P0/P1 sont purement additifs/dormants. Le seul moment sensible est P2, protégé par le **diff d'invariance**.
- **Rollback** : chaque migration a son `_down`. P2 réversible en re-figeant `organization_capabilities` (désactiver le trigger). P3 réversible (retirer les appels `require_entitlement` — retour au gating cosmétique). Les tables additives se suppriment sans impact tant que P4 n'a pas retiré les anciens écrans.

---

## 9. Décisions

### 9.1 Tranchées

| # | Décision | Choix |
|---|---|---|
| Structure | Modèle | **Un objet unique `org_entitlements`** (remplace la cible 4 couches de la 0006) |
| Plans | Nature | **Templates** qui sèment des lignes ; `plans` conservé comme en-tête |
| Feature flags | Périmètre | **Restent séparés** (techniques : kill-switch/A/B), découplés du commercial |
| Prix | Dimension | **Pluggable** (`pricing_kind` + `price_unit`), mixable par org |
| Prix | Types v1 | `none` / `flat` / `per_unit` / `metered` — pure config |
| Gating | Souple/dur | **Explicite par droit** ; durs = `require_entitlement()` côté edge |
| Gating | Liste dure initiale | `measures`, `incidents`, `ai_credits`, `risk`, `seats`, `missions` |
| Compat | Migration | **Compat-first** : `organization_capabilities` reste projection ; diff d'invariance avant bascule |
| Suspension | Sémantique | **Accès coupé (API incluse pour les durs), données CONSERVÉES** |
| Essai | Défaut | 14 j, `trial_ends_at`, accès complet, garde paresseuse |

### 9.2 Reportées / ouvertes

- **Facturation `percentage` (% sur le montant d'une mission) — REPORTÉE (décision 2026-09-13).** Nécessiterait (a) stocker le **montant facturé** d'une mission, (b) le type `percentage`, (c) un hook au bon moment (clôture/facturation). C'est un **choix produit** (modèle de commission / revenue-share : le cabinet doit déclarer ses montants) avant d'être technique. Le modèle **garde la porte ouverte** (ajouter une valeur d'enum + une source de base) sans rien précâbler. Cf. [[project_entitlement_model]].
- **Paliers (`tiered`)** — extension naturelle de `per_unit`/`metered` (bandes de volume). Non v1, faisable sans refonte.
- **« Qui paie pour qui »** — un groupe payant pour ses filiales, un cabinet revendeur des portails clients. À modéliser sur le **graphe d'org (RFC 0001)** via un `billing_org_id` sur l'arête plutôt que sur `org_entitlements`. Cadrage séparé.
- **Compteur métré** — `used_value` stocké (rafraîchi par le meter `ai_calls_log`) vs calculé à la lecture. À trancher en P2.

---

## Annexe A — Mapping migration (existant → cible)

| Existant | Cible `org_entitlements` | Règle |
|---|---|---|
| `org_subscriptions(product='comply', active)` | ligne `key='comply'`, `capability='comply'` | 1 par produit |
| `org_subscription_features(feature)` | ligne `key=<feature>`, `capability` du feature | 1 par feature |
| `organizations.plan_id → plans.max_users` | ligne `key='seats'`, `limit_value=max_users` | NULL = illimité |
| `organizations.plan_id → plans.max_missions` | ligne `key='missions'`, `limit_value=max_missions` | idem |
| `org_quota_limits(org, key, limit)` | écrase `limit_value` de la ligne `key` | surcharge effective |
| `capability_status`/`subscription_status` | `status` | `disabled → suspended` |
| `plans.monthly_price` | `plan_entitlements.price_amount` (`flat`, `month`) | figé à l'application |
| `plan_features(plan_id, flag_id)` | **non migré** | reste flag technique |
| `admin-stats` MRR | supprimé | `org_mrr`/`platform_mrr` seul |

## Annexe B — Seed catalogue (indicatif, FCFA)

| Droit (`key`) | `pricing_kind` | `price_unit` | Gate |
|---|---|---|---|
| `comply` | `flat` | `year` | dur |
| `portal` | `none` (inclus Comply) | — | souple |
| `group` | `per_unit` | `subsidiary` | souple |
| `risk` | `per_unit` | `mission` | dur |
| `policy` | `flat` | `month` | souple |
| `ai_credits` | `metered` | `credit` (`included_qty`) | dur |
| `seats` | `none` (quota) | — | dur |
| `regul` (édition Autorité) | `per_unit` | `assujetti` | dur |
| `measures`, `incidents` | `none` (features Regul) | — | dur |
