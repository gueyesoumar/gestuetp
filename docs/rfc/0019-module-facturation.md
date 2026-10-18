# RFC 0019 - Module de facturation (factures et encaissement)

> Statut : **cadrage / à concevoir** (pas avant priorisation ; aucune implémentation).
> Dérive de : RFC 0018 (convergence des accès), RFC 0008 (entitlement unique), RFC 0006 (abonnement).
> Principe cardinal : **l'accès ne dépend jamais de la facturation.** Les accès (entitlements) disent « ce que l'org a » ; ce module lit ça pour produire l'argent (prix, factures, encaissement).

---

## 1. Thèse

La facturation de Gëstu est aujourd'hui éclatée et sédimentée : `plans.monthly_price` (prix simple, le seul réellement affiché), `org_subscriptions`/`org_subscription_features`/`org_mrr`/`platform_mrr` (couche granulaire RFC 0006, **gelée** depuis 00248, pont retiré), et des prix portés sur `org_entitlements` (inutilisés pour le MRR). Trois demi-systèmes pour une même question : combien paie une org.

Décision (2026-10-18) : la facturation doit à terme **produire des factures et encaisser** (pas seulement afficher un prix). On ne rafistole donc pas l'existant : on conçoit un **module de facturation propre**, séparé des accès, **remplaçant** la couche granulaire gelée plutôt que de la réactiver.

## 2. Séparation des responsabilités

- **Accès** = `org_entitlements` (RFC 0018) : modules, fonctionnalités, quotas d'une org. Source de vérité du gating. **Ne connaît pas les prix.**
- **Facturation** (ce module) : lit les accès d'une org (ce qu'elle consomme) + une grille tarifaire, et produit prix, factures, encaissement. **Ne gate rien.**

Une suspension d'accès (entitlement `suspended`, RFC 0018 Phase 5) et un impayé (facturation) sont deux événements distincts qui peuvent se déclencher l'un l'autre, mais par des chemins explicites, jamais par couplage implicite.

## 3. Périmètre à cadrer (avant tout code)

- **Grille tarifaire** : prix par plan et/ou par produit/module/quota ; surcharges et remises par org ; paliers ; métré (ex. crédits IA, sièges, assujettis).
- **Cycle** : périodes (mois/an), prorata au changement de plan, anniversaire vs calendaire.
- **Factures** : génération (PDF), numérotation légale, mentions, avoirs.
- **Taxes** : TVA Sénégal / exonérations ; multi-devise (XOF principal).
- **Encaissement** : prestataire de paiement (ex. mobile money, carte, virement), relances, statut de paiement, impayés.
- **Reporting** : MRR/ARR fiables, remplaçant `org_mrr`/`platform_mrr`.
- **Reprise** : migration/retrait propre de `plans.monthly_price` (affichage) et de la couche `org_subscriptions` gelée.

## 4. Décisions

- Conçu **quand priorisé**, pas spéculativement. Jusque-là, le prix affiché par cabinet reste `plans.monthly_price` via `organizations.plan_id` (suffisant pour l'usage interne actuel).
- **Découplé** de RFC 0018 : la convergence des accès n'attend pas ce module et ne l'alimente pas.
- **Table rase** : ne reprend pas la dette de `org_subscriptions`/`org_mrr` ; les remplace.

## 5. Hors scope de RFC 0018

RFC 0018 (accès) ne touche pas à la facturation : sa Phase 2 pose `organizations.plan_id` (le prix affiché suit), sans écrire `org_subscriptions`. La réactivation/refonte de la facturation est entièrement portée par cette RFC 0019.
