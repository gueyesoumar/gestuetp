# RFC 0018 - Convergence des accès (plan d'implémentation de l'entitlement unique)

> Statut : **plan d'implémentation** (décisions D1-D4 actées) - avant code.
> Dérive de : RFC 0008 (entitlement unique, vision), RFC 0006 (modèle d'abonnement), RFC 0001 (graphe/capacités).
> Objectif : faire converger les 5 piles d'accès sédimentées vers UN primitif (`org_entitlements`), un catalogue de plans unique, une surface de gestion unique, une création qui applique le plan, et un enforcement serveur réel. Additif et réversible, iso-accès pour les orgs existantes.

---

## 1. Problème

Cinq générations de mécanismes coexistent pour « ce à quoi une org a droit » et ne se parlent pas :
1. `plans` + `plan_id` (tarifaire, choisi à la création).
2. `feature_flags` + `plan_features` + overrides (fonctionnalités fines).
3. `organization_capabilities` (modules) + `editions` (supprimées).
4. `products` + `org_subscriptions` (abonnement RFC 0006, couche intermédiaire).
5. `org_entitlements` (primitif RFC 0008).

Ce qui fait foi au runtime : les **modules** via `org_entitlements` -> `organization_capabilities` -> `my_capabilities`/`hasCapability` ; les **fonctionnalités** via une pile indépendante `plan_id` -> `plan_features` ; les **quotas** via `org_entitlements` ; l'**enforcement serveur** : aucun (tout `soft`, gating cosmétique).

Cinq frictions super-admin : (1) le plan choisi à la création n'active pas les modules (tout naît `comply`) ; (2) config éparpillée sur 4 surfaces ; (3) deux catalogues de plan désynchronisés ; (4) une même fonctionnalité gardée par deux clés ; (5) « suspendre » ne coupe que l'UI.

## 2. Cible

- **Un primitif** : `org_entitlements` gouverne tout droit via une clé canonique.
- **Un catalogue de plans** : un plan = un bundle d'entitlements (modules + fonctionnalités + quotas), source unique.
- **Une surface** de gestion par org (onglet « Abonnement et accès »), chaque droit montrant sa source.
- **La création applique le plan** (avec aperçu).
- **Enforcement serveur réel** là où il y a un enjeu.
- Maquette de référence : artifact « Abonnements et accès » (super-admin).

## 3. Décisions actées

- **D1 - Espace de clés : clés préfixées par nature** (`module.risk`, `feature.ia`, `quota.users`). Le préfixe porte la nature (affichage groupé, registre partagé). Coût ponctuel : mapping/backfill des clés existantes. Registre canonique partagé front/back (`src/lib/entitlements.ts` + table de référence).
- **D2 - Enforcement hard ciblé** : `hard` sur le **statut suspendu** (coupe tout), les **modules payants** (risk/policy/privacy/supervision/incidents) et les **quotas** (users/missions) ; `soft` sur les fonctionnalités de confort (IA, mode d'affichage). Déploiement **observe -> flag -> enforce**.
- **D3 - Facturation découplée (révisé 2026-10-18)** : la facturation devient un **module séparé** (RFC 0019, factures + encaissement, à concevoir quand priorisé) ; **l'accès ne dépend jamais de la facturation**. En attendant, le prix affiché par cabinet reste `plans.monthly_price` via `organizations.plan_id`. La couche granulaire `org_subscriptions`/`org_mrr` est **gelée** (non réactivée ; remplacée par RFC 0019). Donc `apply_plan` ne touche PAS `org_subscriptions` (P2-d option i).
- **D4 - Édition déduite** : la persona Comply/Regul reste dérivée de `module.supervision` (pas d'attribut explicite).

## 4. Pré-requis transverses

- Registre de clés canonique (constantes + table de référence : clé, nature, libellé FR, nature d'enforcement par défaut).
- `database.types.ts` maintenu à la main. Migrations `NNNNN_*_up/_down`. Chaque phase ff-mergée vers staging, CI applique sur snayz. **Aucune phase ne change l'accès effectif** d'une org existante (backfill iso-fonctionnel vérifié).

## 5. Phases

### Phase 0 - Cadrage (pas de code)
Figer le registre de clés (mapping `feature_flags` -> `feature.*` : IA, risk_score_impact, policy_score_impact, supervision_group_mode, connecteurs, marque blanche), la liste des droits `hard` (D2), et le contrat accès/facturation (D3).

### Phase 1 - Rapatrier les fonctionnalités dans l'entitlement (lecture)
- Mig : `org_entitlements` porte les clés `feature.*` ; **backfill** l'état effectif actuel (kill-switch global + `feature_flag_overrides` + `plan_features` via `plan_id`) -> accès inchangé.
- Back : `my_entitlements()` (ou extension de `my_capabilities`) renvoie aussi les features.
- Front : `useFeatureFlag` lit la même pile que `hasCapability` (plus `plan_id`).
- Supprime la friction #4.

### Phase 2 - Plan = bundle unique
- Mig/Back : `plan_bundle_features` (+ modules + quotas) devient la seule définition du contenu d'un plan ; `apply_plan(org, plan)` remplace les entitlements de source `plan` par ceux du bundle, en préservant `override`/`manual`, **et** met à jour l'abonnement (D3).
- Front : `AdminPlansPage` édite le bundle (modules+features+quotas) ; retrait de la matrice `plan_features`.
- Supprime la friction #3.

### Phase 2 (révisé) - apply_plan (option i, découplé de la facturation)
`apply_plan(org, plan_slug)` : (1) pose `organizations.plan_id` -> prix affiché + recalcul des 10 flags via le pont Phase 1 ; (2) écrit les entitlements de **modules** (`plan_products` -> capacité) + **quotas** (`plan_quotas`), `source='plan:<slug>'`, en préservant `manual`/`override` (P2-c) et en retirant les lignes `plan:%` hors plan ; (3) `refresh_org_capabilities`. **Ne touche pas `org_subscriptions`** (facturation = RFC 0019). Les 10 fonctionnalités de gating viennent de `plan_features` (pile B) via le pont Phase 1 ; `product_features`/`plan_bundle_features` restent le catalogue d'affichage du Hub (P2-a' A').

### Phase 3 - La création applique le plan
- Back : `admin-create-cabinet` appelle `apply_plan(org, plan_choisi)` ; retrait du trigger qui force `comply`.
- Front : wizard = identité + plan + aperçu live.
- Supprime la friction #1.

### Phase 4 - Une seule surface de gestion
- Front : fusion `EntitlementConsole` + `CabinetFeatureFlagsTab` + quotas en un onglet « Abonnement et accès » (fiche de la maquette) : Modules / Fonctionnalités / Quotas, badge de source (Plan / Surchargé / Manuel) + « Réinitialiser au plan ». Retrait de l'onglet Fonctionnalités séparé.
- Supprime la friction #2.

### Phase 5 - Suspendre + enforcement hard
- Mig/Back : clés ciblées (D2) passées en `hard` dans `entitlement_gate_policy` ; `entitlement_allows()` branché dans les RLS/edges sur les écritures gardées ; `status='suspended'` -> refus serveur.
- Déploiement **observe -> flag -> enforce** pour éviter tout lockout.
- Supprime la friction #5.

### Phase 6 - Décommissionnement (partiel)
- Arrêt de lecture de `plan_features`/`feature_flags`, retrait du gating `plan_id` pour l'accès. Après soak : drop des tables mortes de la pile fonctionnalités (`plan_features`, `feature_flag_overrides`).
- La couche `org_subscriptions`/`org_mrr` (gelée) et le prix `plans.monthly_price` relèvent de la **refonte facturation (RFC 0019)**, pas de cette RFC.

## 6. Séquencement

1 -> 2 -> 3 (débloquent l'essentiel de la douleur), puis 4 (UX), puis 5 (sécurité réelle), puis 6 (nettoyage). Chaque phase est livrable isolément.

## 7. Risques et garde-fous

- **Backfill** : l'accès effectif ne doit pas bouger au moment de la migration (tests de non-régression par org : set de capacités+features+quotas avant/après).
- **Enforcement hard** : risque de lockout -> observe d'abord, activation par flag, puis enforce ; jeux de tests RLS multi-rôles.
- **Synchronisation accès/facturation** (D3) : `apply_plan` doit écrire accès ET abonnement de façon atomique ; définir le comportement en cas de divergence (l'accès fait foi pour le gating, l'abonnement pour le MRR).
- **Continuité MRR** : vérifier `org_mrr()` après bascule.

## 8. Hors scope

Refonte de la tarification elle-même, facturation externe (Stripe), proratisation fine - traités côté couche abonnement (D3) ultérieurement.
