# RFC 0013 — Framework d'édition data-driven & édition Entreprise

**Statut** : décisions actées (voir §9) — prêt à chiffrer / implémenter
**Prolonge** : RFC 0001 (modèle d'org en graphe), RFC 0002 (capacités + vocabulaire par org, suppression de l'édition runtime), RFC 0003 (moteurs de mission), RFC 0008 (entitlement unique).
**Objectif** : permettre « un seul produit (plateforme Comply), N éditions » où, **à la connexion, un utilisateur ne voit que les interfaces et le vocabulaire de l'édition de son organisation** — et ajouter une 3ᵉ édition **Entreprise** (gestion de sa propre conformité) **sans forker le moteur**.

---

## 1. Décision de principe

1. **Un seul produit, un seul moteur.** « Comply » est la plateforme ; « Regul », « Entreprise » ne sont pas des produits séparés mais des **éditions** = des **kits de provisioning** qui pré-remplissent, pour une org, un jeu de **capacités** + un **preset de vocabulaire**. Cohérent avec RFC 0002 : **l'édition n'est pas un concept runtime**, c'est un raccourci de configuration. Au runtime, tout reste piloté par `organization_capabilities` + vocab par org.
2. **Cloisonnement à l'entrée.** Après authentification, l'org résout ses capacités (`my_capabilities`) + son vocab (`my_vocab`) ; la coquille (routes, navigation, dashboard, libellés, branding) ne rend **que** ce que l'édition inclut. C'est **déjà le comportement de Regul** — on le généralise de 2 éditions à N.
3. **Entreprise = un kit.** `comply + risk + policy` (±`incidents`/`measures`), **sans** `supervision` ni portail tiers, relation **réflexive**, cascade de validation **courte**, vocabulaire dédié. Aucun code spécifique « entreprise ».

## 2. Ce qui existe déjà (socle, à réutiliser)

| Brique | État | Preuve |
|---|---|---|
| Capacités par org | ✅ | `organization_capabilities` (8 capacités), RPC `my_capabilities`, `hasCapability()` monte/masque routes & nav |
| Éditions = preset de capacités | ✅ (partiel) | table `editions` (comply/regul/etp) seed `organization_capabilities` |
| Vocabulaire par org | ✅ | `organization_vocab` + `useVocab` + éditeur de terminologie (23 clés) |
| Moteur de mission par org/mission | ✅ | `workflow_version` (audit/controle), `isStepEnabled` (RFC 0003) |
| Feature flags par org/cabinet | ✅ | `useFeatureFlag` (kill-switch → override cabinet → plan) |
| Entitlements | ✅ structure / ⚠️ non appliqué | `org_entitlements` (RFC 0008) projette en capacités ; gates **tous `soft`** (fail-open) aujourd'hui |
| Cloisonnement UI à l'entrée | ✅ pour 2 éditions | Regul ne voit qu'Assujettis/Contrôles/Constats/Incidents + « Console régulateur » |

**Conclusion** : le mécanisme « n'afficher que son monde à l'entrée » **existe et fonctionne**. Le problème n'est pas de le créer, c'est de le faire passer de **binaire** à **N éditions**.

## 3. Ce qui bloque le passage de 2 → N (les 4 points à généraliser)

Repérés au diagnostic. Aujourd'hui la 3ᵉ édition est impossible **sans toucher au code** à cause de :

1. **Aiguillage binaire `isRegul`** = `hasCapability('supervision')` dans `App.tsx` (jeu de routes + dashboard d'accueil) et `useSidebarNav.tsx` (nav). Une 3ᵉ édition n'a aucune représentation : le code ne connaît que « regul ou pas ».
2. **Vocabulaire à 2 cas en dur** : `product.ts` est un record `{comply, regul}` indexé sur le seul booléen `supervision` (`vocabForPersona`). Pas de 3ᵉ preset data-driven.
3. **Capacités manquantes** pour exprimer les deltas Entreprise de façon déclarative : le **portail tiers** et la **relation externe** sont aujourd'hui implicites (déduits de `cabinet_id ≠ client_id` / du jeu de routes), pas des capacités ; la **cascade de validation** est liée au moteur, non configurable.
4. **Branding/routage structurels** : `logo_tag` et les *route bases* sont marqués non-configurables (`useVocab.ts`), donc une marque/arborescence par édition demande encore du code.

## 4. Modèle cible

### 4.1 Registre de modules piloté par capacités (remplace `isRegul`)
Un **manifeste de modules** déclaratif remplace les ternaires `isRegul`. Chaque module déclare : `requires` (capacités), `routes`, `navItem` (libellé via vocab), et son éligibilité au dashboard d'accueil.

```ts
// esquisse — src/features/edition/moduleRegistry.ts
interface ModuleDef {
  key: string
  requires: Capability[]          // monté si TOUTES présentes
  routes: RouteDef[]
  nav?: { labelVocabKey: string; icon: string; order: number }
  homeDashboard?: boolean         // candidat écran d'accueil
}
```
- `App.tsx` et `useSidebarNav.tsx` **itèrent le registre** filtré par `hasCapability`, au lieu de brancher sur `isRegul`.
- Le dashboard d'accueil est choisi par capacités (ex. `supervision` → console de pilotage ; sinon tableau de bord conformité), pas par une chaîne d'édition.

### 4.2 Nouvelles capacités / réglages (rendre les deltas déclaratifs)
- **`client_portal`** (nouvelle capacité `org_capability`) — existence d'un portail tiers (Cabinet ✓, Régulateur ✓, Entreprise ✗). La « relation externe » est **dérivée** de `client_portal` + du test existant `cabinet_id ≠ client_id` — **pas de capacité `external_relationship` dédiée** (décision §9.f : redondante sur les 3 personas).
- **`review_depth`** (réglage org ∈ `full | short | none`, résolu par mission comme `workflow_version`) — profondeur de la revue : Cabinet `full` (lead→associé→client), Entreprise `short` (revue interne), Régulateur `none` (sans validation client). Décision §9.c.
- **`group_scope`** (capacité **optionnelle**) — périmètre groupe/filiales, activable à la carte (décision §9.d) ; le module group existe déjà.

> Ces capacités/réglages servent **aussi** à nettoyer Comply/Regul (remplacent des `if` existants). Ils ne sont pas « pour Entreprise ».

### 4.3 Vocabulaire N-preset (data-driven)
Sortir `product.ts` du record à 2 cas : les presets de vocab deviennent des **kits** (data), le runtime ne lit que `organization_vocab` avec repli sur le preset du kit. Ajouter le **3ᵉ preset Entreprise**. Rendre `logo_tag` (et, si besoin, un *route base*) **configurables par org** plutôt que structurels.

### 4.4 Kit Entreprise (preset de provisioning)
| Axe | Valeur Entreprise |
|---|---|
| Capacités | `comply`, `risk`, `policy` (± `incidents`, `measures`) ; **sans** `supervision`, **sans** `client_portal` ; `group_scope` en **option** |
| Moteur | `controle` allégé / auto-évaluation |
| Cascade | `review_depth = short` (revue interne, pas de validation client) |
| Cadrage | auto-diagnostic interne (le questionnaire perd sa dimension « client tiers ») |
| Vocab | entité→« entité/service », mission→« campagne », mesure→« plan d'action », intervenant→« contrôleur interne », portail→∅ |
| Rythme | continu (campagnes récurrentes) |
| Marque | **sous Gëstu Comply** (édition, pas de marque distincte — décision §9.a) |
| Instance | **mutualisée** avec Comply (cloisonnement RLS — décision §9.b) |

### 4.5 Relation d'engagement (externe / réflexif) — hybride « cabinet + sa propre conformité »

`client_portal` et `review_depth` se résolvent à **deux niveaux**, exactement comme `workflow_version` :
- **capacité org** = l'org *peut* utiliser portail / cascade (un cabinet l'a) ;
- **résolution par engagement** = *cette* mission les utilise-t-elle.

Une mission **réflexive** (`client_id === cabinet_id` — le sujet audité est l'org elle-même) **n'ouvre pas de portail** et bascule en **revue interne courte**, quelle que soit l'édition de l'org.

**Conséquence (décision §9.g)** : un **cabinet qui veut aussi gérer sa propre conformité ne change pas d'édition et n'en cumule pas deux.** Il reste en édition Cabinet et lance une **campagne réflexive** sur une entité « soi » ; le comportement « entreprise » (pas de portail, revue courte, auto-diagnostic) est **dérivé de la relation réflexive de l'engagement**, pas d'une 2ᵉ édition. L'hybridité vit au niveau des **relations / rôles** (RFC 0001 : rôles = arêtes typées), **jamais des éditions**. Provisionner une org distincte en édition Entreprise (option B) reste possible, mais seulement si une séparation organisationnelle franche (espace, budget, équipe) est réellement voulue.

> Cela **conforte §9.f** : « externe vs réflexif » est une propriété de l'**engagement** (`cabinet_id === client_id`), pas une capacité d'org — d'où l'inutilité d'une capacité `external_relationship`.

## 5. Parcours Entreprise — deltas de flux
- **Pas de portail tiers** : dépôt de preuves et réponses sont internes (même moteur de preuves, sans la couche « client externe »).
- **Cascade courte** : soumission → revue interne → clôture (pas de `client_review`).
- **Cadrage = auto-diagnostic** : le même moteur cadrage↔contrôles, mais rempli en interne (pas d'invitation client).
- **Continu** : s'appuie sur la supervision/campagnes existantes appliquées à soi / son groupe (`group_scope`).

## 6. Sécurité
- Le cloisonnement « ne voir que son édition » reste porté par **trois couches** : masquage UI (capacités), **gardes de route** (`App.tsx` redirige hors édition), **RLS** (données cloisonnées par org). Le registre ne change pas le RLS.
- Les nouvelles capacités **ne doivent jamais** servir de seul garde-fou de données : toute donnée reste protégée par RLS indépendamment de l'UI.
- Pour une feature **exclusive** à une édition (interdite ailleurs, pas seulement masquée), activer le **gate `hard`** de l'entitlement correspondant (aujourd'hui tout est `soft`).
- Non-régression multi-tenant : l'absence de `client_portal` (Entreprise) ne doit **pas** court-circuiter les contrôles d'isolation existants (`cp_*`, helpers staff neutralisés pour role=client) ; le cloisonnement reste porté par le RLS, jamais par la seule UI.

## 7. Chantiers & estimation

| # | Chantier | Fichiers principaux | Complexité | Dépend de |
|---|---|---|---|---|
| C1 | ✅ **Fait** — Registre de modules + itération par capacités (remplace `isRegul`) | `features/edition/moduleRegistry.tsx` (nouv.), `App.tsx`, `useSidebarNav.tsx`, `HubCockpit.tsx` | **M** | — |
| C2 | Vocab N-preset data-driven + 3ᵉ preset | `lib/product.ts`, `lib/vocab-keys.ts`, `useVocab.ts` | **S/M** | — |
| C3 | ↪️ **Replié dans C6** (décision §9.h) — capacité `client_portal` câblée via la chaîne entitlements (pas un insert direct), au moment de bâtir l'édition Entreprise | `org_entitlements` / produit→capacité, migration enum `org_capability` | **M** | C6 |
| C4 | `review_depth` configurable (cascade full/short/none) | `mission-constants.ts`, cascade de validation, `MissionInternalReviewTab` | **M/L** | RFC 0003 |
| C5 | ✅ **Fait (logo_tag)** — `logo_tag` surchargable par org (clé vocab éditable, validée, défaut = preset d'édition). **Route base laissée structurelle** (chemins en dur du registre ; l'édition Entreprise hérite des route bases audit-core — pas besoin de les rendre dynamiques) | `useVocab.ts`, `vocab-keys.ts` | **S** | C2 |
| C6 | Kit/preset Entreprise + provisioning — **inclut** la capacité `client_portal` (ex-C3) câblée via les entitlements, le preset vocab Entreprise, et la dérivation réflexive par engagement | `editions` / produits-entitlements, enum `org_capability`, vocab preset, doc de provisioning | **M** | C1, C2, C4 |
| C7 | Parcours auto-diagnostic (cadrage interne, sans invitation) | scoping (masquage portail/invite) | **M** | C3 |
| C8 | ~~Hard gating~~ **différé (décision §9.e)** — masquage par capacité + RLS suffisent en v1 | — | — | RFC 0008 |

**Avancement** : **C1 livré** en 3 incréments validés sur staging — C1.1 nav (registre + `useSidebarNav`), C1.2 routes (`App.tsx`, modules actifs dérivés du registre), C1.3 Hub (produit primaire + filtrage de l'édition non-primaire → fin de la tuile cross-édition). `moduleRegistry.tsx` porte `enabled` (capacités), `nav`/`group` et `product`. Bonus : correctif du garde-fou de chargement (edLoading inclut l'auth) qui empêchait un refresh sur route gated de rediriger vers l'accueil. Les binaires `isRegul`/`primaryProduct` ont disparu du code.

Complexité indicative : **S** ≈ 0,5–1 j, **M** ≈ 2–3 j, **L** ≈ 4–5 j. Le **cœur du framework = C1 + C2 + C3** (le reste est incrémental). `group_scope` (option) = ligne de capacité, le module existant est réutilisé. Aucun chantier ne touche le moteur de conformité (référentiels, contrôles, constats, preuves).

## 8. Séquencement
1. **Framework d'abord** (C1, C2) : généraliser binaire→registre + vocab N-preset. Bénéfice immédiat pour **Comply et Regul** (dette `isRegul` supprimée), zéro nouvelle édition encore.
2. **Capacités de delta** (C3, C5) : `client_portal`, `external_relationship`, branding configurable.
3. **Kit Entreprise minimal** (C6) + cascade courte (C4) + auto-diagnostic (C7).
4. **Pilotes** : exposer l'édition Entreprise à 2–3 clients, **laisser leur usage réel dicter** les deltas de parcours restants avant d'investir davantage.

## 9. Décisions actées

| # | Décision | Choix retenu |
|---|---|---|
| a | Marque / positionnement | **Reste sous Gëstu Comply** — Entreprise est une *édition*, pas une marque distincte. |
| b | Instance | **Mutualisée** avec Comply (cloisonnement RLS) ; dédiée seulement si un grand compte l'exige plus tard. |
| c | Cascade de validation | **Réglage `review_depth`** ∈ `full / short / none` (pas une capacité binaire). Résolu par mission comme `workflow_version`. |
| d | Groupe / filiales | **`group_scope` en capacité optionnelle** (activable à la carte ; mono-entité par défaut). |
| e | Hard gating | **Différé** — masquage par capacité + gardes de route + RLS suffisent en v1 ; le `hard` (RFC 0008) reste en réserve pour l'enforcement commercial. |
| f | `external_relationship` | **Abandonnée** — redondante avec `client_portal` + `cabinet_id ≠ client_id`. On ne garde que `client_portal`. |
| g | Org hybride (cabinet + sa propre conformité) | **Option A** : engagement **réflexif** dans la coquille Cabinet (`client_id === cabinet_id` → sans portail, revue courte), **pas de 2ᵉ édition**. `client_portal`/`review_depth` résolus **par engagement** (cf. §4.5). Org Entreprise distincte (option B) réservée aux séparations franches. |
| h | Capacité `client_portal` (ex-C3) | **Repliée dans C6.** Diagnostic : `organization_capabilities` est une **projection destructive** de `org_entitlements` (`refresh_org_capabilities` supprime toute capacité non adossée à un entitlement actif). Un seed direct serait donc effacé → `client_portal` doit transiter par la chaîne entitlements (produit→capacité), ce qui ne se justifie qu'avec un vrai consommateur : l'édition Entreprise. On ne fait **pas** C3 en standalone. |

## 10. Hors scope
- Le moteur de conformité (référentiels, contrôles, constats, preuves mutualisées, cadrage↔contrôles) — **inchangé**, partagé par les 3 éditions.
- La facturation détaillée (plans/pricing) — relève de RFC 0006/0008.
- Tout fork de code ou seconde base — **explicitement écarté**.

---

## 11. Plan d'exécution C6 (édition Entreprise)

**Pré-requis acquis** : C1 (registre), C2 (vocab N-preset), C5 (logo_tag). **Réalité du modèle** : les capacités ne sont plus provisionnées par « édition » (legacy 00160) mais **projetées depuis `org_entitlements`** — `refresh_org_capabilities` est **destructif** (supprime toute capacité sans entitlement actif adossé). Il n'existe **aucun setter d'édition admin** ; le levier réel = catalogue produits (`product_capability`) + grant (`admin-entitlement`).

**Principe** : Entreprise = **un bundle de capacités** (`comply + risk + policy`, **sans** `supervision` **ni** `client_portal`). Ce qui **distingue Cabinet d'Entreprise** (tous deux `!supervision`) = la **présence/absence de `client_portal`**.

### 11.1 Backend (testé sur snayz à chaque étape)
- **B1 — enum** : migration *seule* `alter type org_capability add value if not exists 'client_portal'` (contrainte PG : usage impossible dans la txn d'ajout).
- **B2 — type front** : `Capability += 'client_portal'` (database.types.ts).
- **B3 — câblage catalogue** : attacher `client_portal` aux **produits du monde superviseur** (Comply + Regul) via `product_capability`. `client_portal` est une capacité **baseline** (propriété du monde, pas un module vendu).
- **B4 — backfill (anti-régression)** : donner à **toutes les orgs actuelles** (comply/regul) un entitlement `client_portal` (`source='manual'` pour survivre à la projection), puis `refresh_org_capabilities`. **Idempotent.** Sans B4 → le portail disparaît partout. ⚠️ étape critique à vérifier : une org Comply garde `hasCapability('client_portal') = true`.
- **B5 — bundle Entreprise** : définir l'offre (plan/produit = `comply + risk + policy`, **sans** `supervision`/`client_portal`). Pour les pilotes : **grant manuel** du bundle via `admin-entitlement` (un plan catalogue « Entreprise » plus tard).

### 11.2 Frontend (dépend de B3/B4/B5)
- **F1 — module registre `enterprise-core`** : `enabled = !has('supervision') && !has('client_portal')`, placé **avant** `audit-core` ; et `audit-core.enabled` devient `!has('supervision') && has('client_portal')`. Chaque monde reste mutuellement exclusif. `enterprise-core` porte `vocabPreset:'entreprise'`, `product:'Comply'` (marque §9.a), sa nav (Campagnes/Risque/Politiques), ses routes (campagnes = engagements réflexifs sur soi).
- **F2 — 3ᵉ preset vocab** `entreprise` dans `VOCAB_PRESETS` (entité/service, campagne, contrôleur interne, plan d'action, portail ∅).
- **F3 — `review_depth`** (C4) : réglage org `full|short|none` (colonne org + résolution par mission, comme `workflow_version`) ; Entreprise = `short` → masquer l'étape `client_review`.
- **F4 — cadrage auto-diagnostic** : masquer l'invitation portail quand `!client_portal` **ou** engagement réflexif ; le questionnaire se remplit en interne.
- **F5 — garde-fou réflexif** par engagement (`client_id === cabinet_id` → sans portail), sert aussi le cas hybride cabinet (§9.g).

### 11.3 Ordre & vérification
`B1→B2→B3→B4` (le portail devient une capacité, **zéro régression**, à tester) → `B5` + `F1→F2→F3→F4→F5` → **org pilote Entreprise** (grant) testée sur snayz : elle voit le monde Entreprise, pas de portail, revue courte ; une org Comply reste inchangée.

### 11.4 Décisions ouvertes (à trancher au démarrage de C6)
- **i.** `client_portal` = baseline gratuite (attachée Comply/Regul) **ou** entitlement payant ? *(reco : baseline).*
- **j.** Entreprise = nouveau plan catalogue **ou** grant manuel d'un bundle pour les pilotes ? *(reco : grant manuel d'abord).*
- **k.** « Campagnes » = missions réflexives (`moteur contrôle`, sujet = soi) **ou** nouveau type d'unité de travail ? *(reco : réutiliser les missions).*
- **l.** `review_depth` : nouvelle colonne org + résolution par mission (comme `workflow_version`) — confirmer.

---

**En une phrase** : on **finit la généralisation amorcée par RFC 0002** (binaire→registre, vocab N-preset, capacités de delta), ce qui transforme « édition » en pur **preset de provisioning** ; l'édition **Entreprise** devient alors une **configuration**, pas un produit à part — et chaque utilisateur n'entre que dans le monde de son org.
