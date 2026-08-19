# RFC 0006 — Modèle d'abonnement (produits, fonctionnalités, plans, entitlement)

> Statut : **accepté** — maquette validée (console d'abonnement), toutes les décisions tranchées (§10). À implémenter (plan par phases §8).
> Dérive de : RFC 0001 (graphe d'organisation), RFC 0002 (éditions & capacités, vocabulaire au runtime).
> Remplace : le triple mécanisme `organization_capabilities` + `plans`/`plan_features`/`feature_flags` + `editions`, qui décident aujourd'hui « ce qu'une org peut faire » sans jamais se référencer l'un l'autre.
> Maquette de vision : artifact « Console d'abonnement » — https://claude.ai/code/artifact/49314b26-539f-4116-b411-dfad7216ef83 (onglet « Abonnement » du superadmin, calqué sur le chrome réel).

---

## 1. Thèse

Aujourd'hui, savoir si une organisation a accès à Risk, au module Groupe ou aux mesures
graduées se décide dans **trois mécanismes parallèles et déconnectés** :

| Mécanisme | Ce qu'il gate | Tarifé ? | Source d'écriture |
|---|---|---|---|
| `organization_capabilities` (enum `org_capability` plat) | modules/produits (Risk, Policy, supervision, incidents, measures…) | **non** | Edge `admin-set-org-capability` |
| `plans` + `plan_features` + `feature_flags` | fonctionnalités fines | oui (`monthly_price_eur`) | superadmin `/admin/plans` |
| `editions` (preset de capacités) + `organizations.edition` | bascule Comply/Regul/ETP | non | migration/backfill |

Aucun ne référence l'autre : **un plan n'octroie aucune capacité, une capacité n'a pas de
prix, une édition ignore les plans.** Conséquences concrètes :

- souscrire un client à « Comply Groupe » ne débloque pas le module Groupe (deux réglages
  séparés, faciles à désynchroniser) ;
- pas de **cycle de vie commercial** : le statut `capability_status` (`active/trial/disabled`)
  est le seul levier, sans date de fin d'essai, sans notion de suspension pour impayé qui
  *conserve l'historique* ;
- pas de **remise**, pas d'**historique des actes d'abonnement** exploitable commercialement,
  pas de **vue portefeuille** multi-org pour le superadmin ;
- les **produits** (Comply/Regul/Risk/Policy…) ne sont pas de la donnée : ils vivent dans un
  enum figé + `hubProducts.ts` en dur, et **Regul est une édition, pas un produit** — alors
  que le Hub le présente comme un produit au même titre que les autres.

**Cette RFC unifie le tout en 4 couches nettes**, data-driven, avec un seul chemin de
résolution de l'accès — sans big-bang : l'API de gating existante (`org_has_capability()`,
`my_capabilities()`, `hasCapability()`) continue de fonctionner à l'identique pendant toute
la transition.

---

## 2. Les 4 couches

```
┌─ ① CATALOGUE ───────── produits + fonctionnalités = DONNÉE (remplace l'enum + hubProducts.ts)
│    products(comply, regul, risk, policy, privacy, awareness, quality)
│    product_features(product, key, price, is_core)
│
├─ ② ABONNEMENT ──────── couche commerciale (cycle de vie + prix + remise + historique)
│    plans(bundle) · org_subscriptions(org × produit : statut, essai, prix figé)
│    org_subscription_features(à la carte) · organizations.discount_pct · subscription_events
│
├─ ③ ENTITLEMENT ─────── accès RÉSOLU, dérivé de ② (un seul chemin de vérité)
│    my_entitlements() / org_has_capability() reconstruits sur les abonnements
│    organizations.home_product (produit d'accueil déclaré)
│
└─ ④ VOCABULAIRE ─────── SÉPARÉ (RFC 0002) — renomme, ne gate JAMAIS
     organization_vocab (« clients » vs « assujettis ») — inchangé
```

Le principe directeur : **une seule couche décide de l'accès (③), dérivée d'une seule couche
commerciale (②), au-dessus d'un seul catalogue de donnée (①). Le vocabulaire (④) reste
orthogonal : il change les mots, jamais les droits.**

---

## 3. Décisions actées (via la maquette)

| # | Décision | Choix |
|---|---|---|
| Modèle | Structure | **4 couches** : catalogue → abonnement → entitlement → vocabulaire |
| Produits | Nature | **Donnée** (table `products`), plus un enum figé. Regul **devient un produit** de plein droit |
| Cycle de vie | Statut d'abonnement | **`active` / `trial` / `suspended`** — le statut pilote **à la fois l'accès ET la facturation** |
| Essai | Durée | **14 jours** par défaut (`trial_ends_at`), non facturé, accès complet |
| Suspension | Sémantique | **accès coupé, historique et données CONSERVÉS** (≠ retrait, qui purge l'abonnement) |
| À la carte | Granularité | souscription **par produit**, features fines activables (`org_subscription_features`) |
| Remise | Niveau | **par organisation** (`discount_pct`), appliquée au MRR net (preset 0/10/20/30 %, valeur libre stockée) |
| Historique | Traçabilité | **journal des actes d'abonnement** (acteur + horodatage + type), réutilise la piste d'audit F6 |
| Accueil | `home_product` | produit d'atterrissage déclaré par org (Comply/Regul exclusifs comme accueil) |
| Portefeuille | Superadmin | **vue multi-org** : MRR agrégé sur toutes les orgs |
| Compat | Migration | **compat-first, pas de big-bang** : `org_has_capability()` inchangé, `organization_capabilities` devient **dérivée** des abonnements |

Décisions détaillées (toutes tranchées) : §10.

---

## 4. Modèle de données cible

Tout est **org-scoped** côté abonnement, **écritures `service_role` uniquement** (comme
`organization_capabilities` aujourd'hui — cf. Edge `admin-set-org-capability`). Le catalogue
(①) est public en lecture (données non sensibles). RLS détaillée en §6.

### 4.1 ① Catalogue

**`products`**
- `key` text PK — `comply | regul | risk | policy | privacy | awareness | quality`
- `label` text, `tagline` text
- `accent_color` text — couleur signature (source unique, remplace `hubProducts.ts`, cf. §10.1)
- `is_home_eligible` boolean — peut être produit d'accueil (Comply, Regul)
- `is_published` boolean — `false` = « bientôt » (Privacy/Awareness/Quality)
- `sort_order` int

**`product_features`**
- `id`, `product_key` → products
- `key` text — stable, ex. `groupe`, `measures`, `incidents`, `bowtie`, `ai`…
- `label` text
- `is_core` boolean — inclus d'office à la souscription du produit
- `monthly_price_eur` numeric(10,2) default 0 — supplément add-on
- `capability` `org_capability` NULL — **pont de compat** : la capacité que cette feature
  octroie (permet de régénérer `organization_capabilities`, §5)
- unique (`product_key`, `key`)

**`products.monthly_price_eur`** numeric(10,2) — prix de base du produit (socle).

### 4.2 ② Abonnement

**`plans`** (00069/00121, **conservés tels quels**) — un plan devient un **bundle** : un raccourci
qui crée d'un coup les abonnements + features correspondants.
- colonne ajoutée : `home_product` text → products
- `plan_products(plan_slug, product_key)` + `plan_bundle_features(plan_slug, product_key, feature_key)`
  — tables **additives** décrivant ce qu'un bundle octroie.
- ⚠️ **Ne PAS confondre avec `plan_features(plan_id, flag_id)`** (00122) : ce dernier reste le
  système de **flags TECHNIQUES** (kill-switch, A/B via `useFeatureFlag`), orthogonal à
  l'abonnement commercial (Annexe B). D'où le nom distinct `plan_bundle_features`.
- le prix d'un plan est **calculé** depuis le catalogue (`monthly_price_eur` legacy conservé en repli).

**`org_subscriptions`** — cœur : **une ligne par (org, produit) souscrit**.
- `id`, `organization_id` → organizations, `product_key` → products
- `status` `subscription_status` CHECK(`active | trial | suspended`)
- `trial_ends_at` timestamptz NULL (si `trial`)
- `unit_price_eur` numeric — **prix figé à la souscription** (le catalogue peut bouger sans
  reprricer rétroactivement)
- `plan_slug` text NULL — plan d'origine si souscrit via bundle (sinon « à la carte »)
- `discount_pct` smallint default 0 CHECK(0..100) — **remise par produit** (10.3)
- `started_at`, `suspended_at`, `created_by`, `updated_at`
- unique (`organization_id`, `product_key`)

**`org_subscription_features`** — features à la carte activées.
- `subscription_id` → org_subscriptions (ON DELETE CASCADE)
- `feature_key` text, `unit_price_eur` numeric (figé)
- unique (`subscription_id`, `feature_key`)

**`organizations.discount_pct`** smallint default 0 CHECK(0..100) — remise **globale** de l'org.

> **Cumul des remises (10.3)** : le MRR net se calcule ligne par ligne — pour chaque
> abonnement actif, `prix_ligne × (1 − org_subscriptions.discount_pct/100)` (prix produit +
> features) —, on **somme** les lignes, puis on applique la remise **globale**
> `× (1 − organizations.discount_pct/100)`. Ordre figé : produit d'abord, org ensuite.
> Calcul en SECURITY DEFINER (`org_mrr()`), jamais côté client.
**`organizations.home_product`** text → products NULL — produit d'accueil (③).

**`subscription_events`** — historique des actes. **Choix : réutiliser la piste d'audit F6**
(`activity_log`, chaîne de hash par org, append-only — cf. [[project_audit_trail]]) avec des
types d'action dédiés (`subscription.subscribe`, `.trial`, `.suspend`, `.reactivate`,
`.remove`, `.plan_apply`, `.discount`, `.feature_toggle`, `.home_change`). Pas de nouvelle
table : l'infrastructure probante existe déjà et garantit acteur + horodatage + inaltérabilité.

**Nouvel enum** `subscription_status` : `active | trial | suspended`. (Distinct de
`capability_status` existant `active/trial/disabled` — mapping `disabled → suspended` au backfill.)

**Quotas (10.4)** — rebranchés sur le modèle d'abonnement. Les quotas actuels (`plans.max_users`,
`plans.max_missions`, mig 00121/00125) sont **résolus au niveau org** (une feature *core* comme
« missions » n'a pas de ligne `org_subscription_features` où poser une limite) :
- **`plan_quotas`** `(plan_slug, quota_key text, limit_value int NULL)` — quota **par défaut**
  livré par un bundle (catalogue). `quota_key ∈ (users, missions, …)`, extensible. `NULL`/absent = illimité.
- **`org_quota_limits`** `(organization_id, quota_key, limit_value int NULL)` — limite **effective
  et enforced** par org. **Semée** depuis `plan_quotas` à l'application d'un plan, **surchargeable**
  en console (service_role). Absent = illimité.
- Les fonctions d'enforcement `check_user_quota()` / `check_mission_quota()` (00125) sont
  **réécrites pour lire `org_quota_limits`** au lieu de `plans.max_*` — **triggers et exemption
  `platform` inchangés**, aucun changement de comportement à limites égales. Extensible à de
  nouveaux `quota_key` sans nouveau trigger générique.

### 4.3 ③ Entitlement (dérivé, pas stocké)

Aucune nouvelle table. L'accès se résout **à la volée** depuis ② :

- une org **possède** un produit/feature si elle a un `org_subscriptions.status ∈ (active, trial)`
  (une suspension coupe l'accès ; un essai le donne) — **avec garde paresseuse (10.5)** : un
  `trial` dont `trial_ends_at` est dépassé **n'accorde pas** l'accès, même avant le passage du
  job de suspension ;
- `organization_capabilities` reste peuplée mais devient **une projection** de ② (§5), pour ne
  casser aucun appelant existant.

### 4.4 ④ Vocabulaire — inchangé

`organization_vocab` (RFC 0002, mig 00166) reste **strictement séparé**. Il renomme (« clients »
↔ « assujettis », terme mission…) ; il ne décide **jamais** d'un accès. Réaffirmé ici pour
éviter la tentation de fusionner les deux couches.

---

## 5. Résolveur d'entitlement (compat-first)

Le point dur de la migration : **ne rien casser**. Aujourd'hui, `org_has_capability()`,
`my_capabilities()` et `hasCapability()` (front `useEdition`) lisent `organization_capabilities`,
et de nombreuses policies RLS s'appuient dessus (Risk/Policy/supervision…).

**Stratégie : `organization_capabilities` devient une projection dérivée de ②.** Un
`refresh_org_capabilities(p_org)` (SECURITY DEFINER) régénère les lignes de l'org depuis ses
abonnements actifs/essai, via le pont `product_features.capability` + une table
`product_capability(product_key, capability)` pour les produits eux-mêmes :

```
active/trial subscription ─▶ capability du produit (product_capability)
                           └▶ capability de chaque feature activée (product_features.capability)
                                    ▼
                        upsert organization_capabilities(status = subscription.status mappé)
                        delete des capacités qui n'ont plus de source
```

Appelé par trigger sur `org_subscriptions` / `org_subscription_features`. Résultat : **zéro
changement pour tous les appelants** (front, RLS) — ils lisent toujours `organization_capabilities`,
qui reflète désormais la vérité commerciale. À terme (phase de nettoyage), la table pourra
devenir une **vue**.

Nouvelles primitives (pour les écrans d'abonnement et le portefeuille) :
- `org_subscription_state(p_org)` → jsonb (produits, statuts, features, remise, home) ;
- `org_mrr(p_org)` → numeric (MRR net, remise incluse) — calcul serveur, jamais côté client ;
- `platform_mrr()` → numeric (portefeuille, superadmin only).

---

## 6. Sécurité (non négociable)

- **Écritures `service_role` uniquement** sur ②/① : toute mutation d'abonnement passe par une
  Edge Function admin (`admin-subscription-*`), jamais par le client — comme
  `admin-set-org-capability` aujourd'hui. Le front n'a **aucun** droit d'écriture direct
  (pas d'élévation de privilège côté client — CLAUDE.md §3).
- **RLS** : `products`/`product_features`/`plans` lisibles par tout `authenticated` (non
  sensibles). `org_subscriptions`/`org_subscription_features`/`organizations.discount_pct`
  lisibles **own-org** (`organization_id = get_my_organization_id() and not is_client_role()`)
  + policy RESTRICTIVE `is_aal2()` — même patron que Risk (mig 00184) / Policy (mig 00190).
  Un **client portail ne voit jamais** l'abonnement de l'org (cf. [[project_client_rls_leak]]).
- **Pas de récursion RLS** : les helpers (`get_my_organization_id`, `is_client_role`, `is_aal2`)
  sont SECURITY DEFINER, aucune policy n'interroge sa propre table (CLAUDE.md §3).
- **MRR calculé serveur** : `org_mrr()`/`platform_mrr()` en SECURITY DEFINER — aucun prix ni
  agrégat de portefeuille n'est recomposé depuis le client (le client ne connaît pas les prix
  des autres orgs).
- **Historique inaltérable** : les actes passent par `activity_log` (chaîne de hash par org,
  append-only — F6), donc traçabilité probante native.

---

## 7. Écrans d'admin (superadmin)

La maquette validée est la cible : un onglet **« Abonnement »** dans le détail organisation
(`CabinetDetailPage`), calqué sur le chrome réel (sidebar admin, en-tête org, onglets
`gold-500`, cartes `rounded-xl border-gray-200 bg-white`, boutons `forest-700`).

- **Bandeau récap** : produit d'accueil, plan, remise, MRR net, compteurs actifs/essais/suspendus.
- **Plans** : bundles applicables en un clic (crée les abonnements + features).
- **Produits & fonctionnalités** : par produit, statut (`<select>` actif/essai/suspendu) ou
  Souscrire/Essai si non souscrit ; features en cases (`accent-forest-700`) ; badge « ★ Accueil ».
- **Accès résolu & revenu** : entitlement dérivé + carte MRR (brut → remise → net) + chips remise.
- **Historique des actes** : lecture de `activity_log` filtré sur les actions d'abonnement.
- **Multi-org** : sélecteur d'organisation + chip « Portefeuille » (MRR agrégé, `platform_mrr()`).

Les anciens écrans `/admin/plans` (catalogue de plans) et l'onglet « Modules Hub »
(`AdminOrgModulesCard`, capacités brutes) fusionnent dans cette console unifiée.

---

## 8. Plan par phases (compat d'abord)

**P1 — Catalogue (①), additif, dormant.** Créer `products`, `product_features`,
`product_capability` ; seed depuis l'enum actuel + `hubProducts.ts` + BRAND.md. Aucun gating
branché. Front : lire les couleurs/labels produits depuis `products` (retirer `hubProducts.ts`
en dur). **Zéro changement de comportement.**

**P2 — Abonnement (②) + quotas + bundles, additif/dormant.** *(FAIT — mig 00199/00200/00201)*
- **A** : enum `subscription_status`, `org_subscriptions`, `org_subscription_features`, colonnes
  `organizations.discount_pct`/`home_product` + **backfill** depuis `organization_capabilities` +
  `editions`/`organizations.edition` + `organizations.plan_id` (Annexe A). Diff d'invariance ✓ (=0).
- **B (quotas, 10.4)** : `plan_quotas`/`org_quota_limits`, backfill depuis `plans.max_*`,
  `check_user_quota`/`check_mission_quota` (00125) réécrits pour lire `org_quota_limits` **avec
  fallback `plans.max_*`** (comportement identique). Triggers inchangés.
- **D (bundles)** : `plan_products` + `plan_bundle_features` + `plans.home_product` + seed. Additif ;
  `plan_features(plan_id,flag_id)` technique **intact** ; UI `/admin/plans` inchangée.
- **Rien ne LIT ② encore** → zéro changement runtime. Gating branché en P3.

**C+P3 — Dépréciation éditions + entitlement dérivé (③).** *(couplés : cf. 10.2/00164)*
- **C (éditions)** : migrer les derniers lecteurs de `organizations.edition` vers la capacité
  `supervision` — edges (`_shared/vocab.ts`, `manage-org-vocab`), `sync_org_parent_edge` (00164),
  `TerminologyEditor` ; **réécrire le provisioning** `sync_org_capabilities` (00164) en provisioning
  **par abonnement** ; puis DROP `get_my_edition()` + `organizations.edition` + table `editions`.
- **P3 (flip)** : `refresh_org_capabilities()` + triggers sur `org_subscriptions` → **② devient la
  source de vérité**, `organization_capabilities` en est la projection. Vérifier par diff que la
  projection == l'état actuel (invariance stricte avant/après). Primitives MRR.
- Couplés car sans éditions le provisioning d'une nouvelle org **doit** passer par un abonnement
  (sinon, capacités dérivées ⇒ une org sans abonnement perd tout accès).

**P4 — Console superadmin.** Edge Functions `admin-subscription-*` (service_role) + onglet
« Abonnement » (maquette). Câbler l'historique sur `activity_log`. **Job d'expiration d'essai
(10.5)** : tâche planifiée quotidienne (`pg_cron`/edge) `trial → suspended` past `trial_ends_at`
+ journalisation + notification superadmin. Retirer `AdminOrgModulesCard` et fusionner `/admin/plans`.

**P5 — Nettoyage (différé, non bloquant).** Éventuellement transformer
`organization_capabilities` en vue. (La dépréciation des `editions` a lieu en C+P3.) Chaque retrait
derrière vérification qu'aucun appelant ne subsiste.

CI Deploy (`.github/workflows/deploy.yml`) applique migrations + Edge Functions automatiquement
(staging = auto, main = gate approbation) — cf. [[project_migrations_deploy]]. Flux de branches :
`feat/subscription-model` → staging (test snayz) → PR main — cf. [[feedback_branch_flow]].

---

## 9. Rétro-compatibilité & rollback

- **Compat** : garantie par §5 — tout le code de gating existant continue de lire
  `organization_capabilities`. P1/P2 sont purement additifs et dormants ; le seul moment
  « sensible » est P3 (bascule de la source de vérité), protégé par un **diff d'invariance**
  (la projection doit être identique à l'état pré-bascule) avant activation.
- **Rollback** : chaque migration a son `_down`. P3 réversible en re-figeant
  `organization_capabilities` (désactiver le trigger, la table redevient autoritaire). Les
  colonnes/tables additives se suppriment sans impact tant que P4 n'a pas retiré les anciens
  écrans.

---

## 10. Décisions (tranchées)

**10.1 Couleurs produits — TRANCHÉ : `hubProducts.ts` fait foi.** `products.accent_color` est
peuplé depuis la palette du Hub live (7 teintes distinctes) : Comply `#40916C` (vert forêt),
Regul `#D4A843` (or), Risk `#E07A5F` (terracotta), Policy `#7B68EE` (violet), Privacy `#3B82F6`
(bleu), Awareness `#E67E22` (orange), Quality `#0891B2` (cyan). L'or reste **réservé au chrome**
(accent global), pas à un produit-signature. **BRAND.md est mis à jour** pour aligner sa table
« Couleurs produits » sur cette palette et la compléter (Regul/Awareness/Quality). Aucun
recolorage du Hub (les tuiles restent celles que les utilisateurs reconnaissent).

**10.2 Regul comme produit vs édition — TRANCHÉ : déprécier ; DROP en C+P3.** Regul devient un
produit (§3) et le plan **« Regul Autorité »** remplace l'édition. Le DROP de `organizations.edition`
+ table `editions` + `get_my_edition()` est **couplé à P3** : le trigger de provisioning
`sync_org_capabilities` (00164) lit `editions` pour donner ses capacités à une nouvelle org — sans
éditions, ce provisioning **doit** passer par un abonnement (= P3, sinon capacités dérivées ⇒ une org
sans abonnement perd tout accès). Les autres lecteurs (`get_my_edition` — aucun appelant vivant ;
edges `_shared/vocab.ts`/`manage-org-vocab` ; `sync_org_parent_edge` ; `TerminologyEditor`) se migrent
proprement vers la capacité `supervision` dans la phase **C+P3**. Décision de séquencement actée après
constat du couplage 00164.

**10.3 Granularité de la remise — TRANCHÉ : org + par-produit dès v1, cumulables.** Deux
niveaux : `org_subscriptions.discount_pct` (par produit) et `organizations.discount_pct`
(globale). Cumul dans l'ordre produit → org (formule en §4.2). Permet le produit d'appel
(Risk offert) comme le rabais global (secteur public) simultanément.

**10.4 Quotas — TRANCHÉ : rebranchés dès v1.** Deux tables (§4.2) : `plan_quotas` (défaut par
bundle) + `org_quota_limits` (effectif par org, semé du plan, surchargeable en console). Les
fonctions `check_user_quota`/`check_mission_quota` (00125) lisent désormais `org_quota_limits` ;
triggers et exemption `platform` conservés. Backfill : `plans.max_users`/`max_missions` par org
→ `org_quota_limits` (cf. Annexe A). Modèle extensible à d'autres quotas sans nouveau trigger.

**10.5 Fin d'essai — TRANCHÉ : suspendre + notifier, jamais de facturation implicite.** À
l'expiration de `trial_ends_at`, l'essai passe en `suspended` (accès coupé), le superadmin est
notifié, et la conversion en `active` reste un **acte commercial explicite**. Mise en œuvre : job
planifié quotidien (`pg_cron`/edge) qui flippe les essais expirés + journalise l'acte + notifie ;
**+ garde paresseuse dans le résolveur** d'entitlement (un essai dont `trial_ends_at` est dépassé
n'accorde jamais l'accès, même avant le passage du job). Conforme à la réalité B2B contractuelle
(facturation manuelle), safe-by-default.

---

## Annexe A — Mapping migration (existant → cible)

| Existant | Cible ② | Règle de backfill |
|---|---|---|
| `organization_capabilities(cap='comply', active)` | `org_subscriptions(product='comply', active)` | 1 abonnement par produit-capacité |
| `organization_capabilities(cap='risk'/'policy'/'privacy'/'awareness')` | `org_subscriptions(product=<cap>)` | idem, statut mappé |
| `organization_capabilities(cap='supervision'/'incidents'/'measures')` | `org_subscriptions(product='regul')` + `org_subscription_features(feature=<cap>)` | ces capacités = features de Regul |
| `capability_status = active/trial/disabled` | `subscription_status = active/trial/suspended` | `disabled → suspended` |
| `organizations.edition = 'regul'` | abonnement `regul` (si pas déjà via capacités) | cohérence édition ↔ produit |
| `organizations.plan_id` | `org_subscriptions.plan_slug` | traçabilité du plan d'origine |
| `plans.monthly_price_eur` | prix **calculé** depuis catalogue | ne plus stocker en dur |
| `plan_features(plan_id, flag_id)` | **conservé** (flags techniques) ; nouveau `plan_bundle_features(plan_slug, product_key, feature_key)` en parallèle | ne pas fusionner : commercial (bundle) vs technique (flag) restent séparés (Annexe B) |
| `plans.max_users` / `plans.max_missions` | `org_quota_limits(org, quota_key, limit_value)` | par org : `users` ← max_users, `missions` ← max_missions ; NULL = illimité ; `platform` exempt |

## Annexe B — Catalogue produits/features (seed initial)

| Produit | Accueil | Features (core en gras) |
|---|---|---|
| **Comply** | ✔ | **missions**, **référentiels**, **portail client**, groupe (add-on) |
| **Regul** | ✔ | **assujettis**, **contrôles**, mesures graduées, incidents, chaîne probante |
| **Risk** | — | **registre EBIOS**, **nœud papillon**, simulateur |
| **Policy** | — | **registre & cycle de vie**, attestations, couverture, rédaction IA |
| **Privacy** | — | *(bientôt — `is_published=false`)* |
| **Awareness** | — | *(bientôt)* |
| **Quality** | — | *(bientôt)* |

> `feature_flags` (00071) reste pour les **bascules techniques** (kill-switch global, A/B,
> déploiement progressif) — orthogonal à l'abonnement commercial. Ne pas confondre les deux :
> un flag technique coupe une fonctionnalité en incident ; un abonnement décide d'un droit vendu.
