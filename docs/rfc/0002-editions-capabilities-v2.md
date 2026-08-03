# RFC 0002 — Capacités + vocabulaire par org : suppression de l'édition au runtime

**Statut** : proposition (cadrage, avant tout code)
**Prolonge** : RFC 0001 (modèle d'org en graphe entité/capacité), découplage produit runtime (suppression `VITE_PRODUCT`).
**Remplace** : la première mouture de ce RFC (« édition = archétype de contexte »), abandonnée — l'édition ne gagne pas son statut de concept runtime.

---

## 1. Décision de principe

**On supprime la notion d'« édition » au runtime.** Une organisation est entièrement définie par **deux axes indépendants** :

1. **Capacités** (`organization_capabilities`) — *ce qu'elle peut faire* (les modules), **à la carte, par org**.
2. **Vocabulaire par org** — *comment elle nomme les choses* (les libellés), **self-service**.

Tout le reste que l'édition portait (`comply`/`regul`/`etp`, `get_my_edition`, `EditionContext.edition`, ~20 branchements `edition === 'regul'`) **disparaît**. Le code devient générique : il rend ce que les capacités + le vocab disent, jamais « si édition = regul ».

## 2. Motivation

- **Besoin métier** : activer/désactiver un module **au besoin, pour un client déterminé** (entitlements SaaS).
- **Constat** : le seul apport réel de l'édition au quotidien était le **vocabulaire** — or le vocabulaire est une **préférence par org**, pas un template figé. Une fois les capacités (modules) et le vocab (mots) gérés par org, l'édition est un **doublon** : un troisième concept qui ne fait que pointer vers les deux autres.
- **Conséquence** : la garder = maintenir une indirection inutile + du code qui branche en dur (`edition === 'regul'`), non scalable.

## 3. La frontière à garder claire

**Le vocabulaire *renomme* ; les capacités décident *ce qui existe*.**
- On ne transforme pas un cabinet Comply en régulateur en renommant « clients » → « assujettis ». Les écrans régulateur (pilotage du parc, mesures graduées, incidents, chaîne probante) existent parce que les **capacités** `supervision`/`measures`/`incidents` sont actives.
- **Capacités** → montent les bons écrans/modules (structure).
- **Vocab par org** → habille de mots ces écrans (labels).
- Le « feel régulateur » = `supervision+measures+incidents` **+** un vocab « assujettis ». Aucune magie « édition ».

## 4. Modèle de données cible

1. **Capacités = source de vérité, éditables par org.** `organization_capabilities(org_id, capability, status)` devient modifiable (ajout/suppression indépendants), `status active | suspended` pour désactiver sans perdre l'historique. Enum figé `org_capability` : `comply, risk, policy, privacy, awareness, incidents, measures, supervision`.
2. **Vocabulaire par org.** Nouvelle table `organization_vocab(org_id, key, value)` (ou `jsonb` sur `organizations`), lue par org avec **repli sur un défaut** si non défini. Clés candidates (les « éléments susceptibles de changement ») :
   - entité : `entity_singular`, `entity_plural`, `entities_title`, `entity_with_dem`
   - portail : `portal_label`
   - modules (optionnel) : `mission_term` (missions ↔ contrôles), `measure_term`, `finding_term`
   - présentation : `context_banner`, `dashboard_title`, `logo_tag`
3. **Suppression de l'édition** : retrait de `organizations.edition`, `get_my_edition()`, de la dépendance runtime à `editions`, et de `EditionContext.edition`. `EditionContext` se réduit à `capabilities` (renommer en `CapabilitiesContext`).
4. **Templates de provisioning (optionnel, hors runtime)** : au mieux un catalogue léger de kits de démarrage (« Régulateur », « Cabinet ») = raccourcis de création qui pré-remplissent capacités + vocab. Aucun code ne les relit au runtime.

## 5. Généralisation du code — retirer les `if edition === 'regul'`

Règle : brancher sur **capacités** (« ai-je le module X ? ») + **vocab** (labels), jamais sur une chaîne d'édition.

| Zone | Fichiers | Bascule cible |
|---|---|---|
| Routing / shell | `App.tsx` (index dashboard, jeu de routes, `/client/incidents`) | routes montées **par capacité** (incidents si cap `incidents`, etc.) ; dashboard d'accueil choisi **par capacités** (pilotage si `supervision`) |
| Layout / nav | `AppLayout.tsx` (bandeau), `useSidebarNav.tsx` | bandeau = vocab `context_banner` (rendu si défini) ; items **par capacités** (déjà partiel) |
| Hub | `OrbitCockpit.tsx` (`primaryProduct`) | produit primaire dérivé des **capacités**, pas `=== 'regul'` |
| Vocab | `product.ts` (`vocabForEdition`, `ProductMode`), `useVocab.ts`, `useIsRegul.ts` | `useVocab` lit le **vocab par org** ; `useIsRegul` supprimé ou remplacé par des tests de capacité |
| Features groupe | `SubsidiaryCard/DetailPage`, `SubsidiariesPage`, `EntityFormModal`, `useManageEntity` | champs profil réglementaire = capacité `supervision` (pas `isRegul`) |
| Portail | `ClientSidebar.tsx`, `ClientMissionsPage.tsx` | par **capacités du superviseur** + vocab |
| Auth / marque | `useMfa.ts` (issuer), `LoginPage.tsx` (redirect), `GestuLogo.tsx` (tag) | issuer/logo depuis vocab (`logo_tag`) ; redirect inchangé (piloté par rôle) |

`preAuthEdition()` (indice pré-auth par hostname/env pour l'allure du login) peut rester comme **simple indice de branding pré-auth**, découplé de tout concept d'édition runtime.

**Surfaces serveur (découverte du scan)** : les emails/Edge Functions (`supabase/functions/_shared/email-templates.ts`, `reminder.ts`, `car.ts`) sont **entièrement figés en cadrage « cabinet / auditeur / audit »** et ne consomment aucun vocab. Le vocab par org doit donc être **lisible côté serveur** (`service_role`, au moment de l'envoi), pas seulement au front. C'est une surface à part entière (résolution du vocab de l'org destinataire/émettrice avant rendu du template).

## 6. Écrans d'admin

1. **Capacités par org** (console super-admin) : toggle actif/suspendu par module ; écriture via Edge Function `service_role` + **journalisation de l'acte** (comble le manque « piste d'audit des actes » de l'audit Regul).
2. **Terminologie par org** : éditeur des clés de vocab, avec repli visible sur les défauts.

## 7. Sécurité (non négociable)

**Une capacité est un entitlement fonctionnel/UX, PAS une frontière de sécurité.** Le cloisonnement des données reste porté par la **RLS** (`visible_target_ids`, `is_client_role`, policies `cp_*`) et les gardes edge. Activer/désactiver une capacité ne doit **jamais** être le seul rempart d'un accès sensible ; tout accès sensible reste doublé côté serveur. Écriture des capacités et du vocab = `service_role` only.

## 8. Plan par phases (compat d'abord, pas de big-bang)

- **P1 — Vocabulaire par org.** Table `organization_vocab` + backfill des défauts (les valeurs codées comply/regul actuelles). `useVocab` lit par org avec repli. **Iso-fonctionnel** : comply et regul rendent exactement pareil. Aucune régression.
- **P2 — Généraliser la coquille sur les capacités.** Remplacer les `=== 'regul'` un par un (dashboard, routes, bandeau, Hub, features), **équivalence prouvée** à chaque site. À l'issue, plus aucun code ne lit `edition`.
- **P3 — Capacités éditables + écrans admin.** Découpler les capacités du seed ; livrer les toggles capacités **et** l'éditeur de terminologie ; journaliser.
- **P4 — Retrait de l'édition.** Une fois plus rien ne lit `edition` : supprimer la colonne, `get_my_edition`, la dépendance runtime à `editions`. Remplacer par des **templates de provisioning** (raccourcis de création) si la commodité en vaut la peine.
- **Futur — Plans de facturation.** Si besoin, un objet « plan/SKU » = bundle payant de capacités, adossé à la couche capacités + pricing (jamais à la coquille).

Chaque phase laisse l'app verte (typecheck+build) et les parcours Comply **et** Regul fonctionnels, via le pipeline `feat/* → staging → main`.

## 9. Rétro-compatibilité & rollback

- P1/P2 sont **iso-fonctionnelles** (mêmes rendus) → rollback trivial.
- P3 introduit l'édition à la carte des capacités (nouvel état) → rollback = re-seed depuis un template.
- P4 est irréversible « en douceur » : ne l'exécuter qu'après avoir prouvé (grep + tests) que **plus aucun** code ni RLS ne référence `edition`. Migrations `up`/`down` par phase (convention `NNNNN_nom_up/_down.sql`).

## 10. Décisions (arrêtées le 2026-08-03)

1. **Schéma du vocab** → table `organization_vocab(org_id, key, value)`, repli sur un défaut applicatif. Requêtable, extensible sans migration de colonne.
2. **Qui édite le vocab** → super-admin Gëstu au provisioning + admin de l'org en ajustement fin. Écriture `service_role` + journalisée.
3. **Étendue des clés** → **ensemble fixe et documenté** (issu du scan de code 2026-08-03), borné à ce qui varie par contexte :
   - entité : `entity_singular`, `entity_plural`, `entities_title`, `entity_with_dem`, **`entity_gender`** (m/f — pilote l'accord FR ; remplace le bricolage `endsWith('e')` de `SubsidiariesPage`/`EntityFormModal`/`InactiveEntitiesSection`)
   - rôles : **`provider_term`** (cabinet ↔ régulateur/autorité — angle mort majeur, présent partout y compris les emails), **`auditor_term`** (auditeur/chef de mission ↔ contrôleur/inspecteur)
   - modules : `mission_term`, `measure_term`, `finding_term`
   - portail : `portal_label`
   - présentation : `context_banner`, **`context_banner_sub`** (titre + sous-titre du bandeau, éditables séparément)
   - mineures / à dériver ou différer : `clients_nav_label`, `measures_nav_label` (« Constats & mesures » composé), `portfolio_label`

   Le reste (boutons, messages système, enums de mesures/statuts, routes, branding marque-blanche, modules capability-gated) reste **fixe** — pas personnalisable (sinon = localisation ou casse du mapping enum/RLS).

   **Le vocab n'est pas un simple `clé→string`** : `entity_gender` porte une métadonnée grammaticale → le modèle prévoit une valeur pouvant être structurée (ou une clé companion).
4. **Templates de provisioning** → **cloner depuis une org de référence** (action super-admin « provisionner à partir de \<org type\> » qui copie capacités + vocab). Pas de table catalogue ; les orgs « Régulateur type » / « Cabinet type » **sont** les templates. Promotion vers un catalogue managé plus tard, avec les plans.
5. **Statut des capacités** → `active` / `suspended` uniquement. `trial` + expiration différés à la facturation. *Note technique : ajouter `suspended` = `ALTER TYPE ADD VALUE` (non-transactionnel) → migration dédiée isolée.*

---

## Résumé

- **Runtime = capacités (modules) + vocab par org (mots).** Rien d'autre.
- **L'édition disparaît** comme concept runtime (colonne, résolveur, ~20 branchements) — au mieux un **template de provisioning** optionnel.
- Le code passe de « `if edition === 'regul'` » à « **rends ce que les capacités + le vocab disent** » → générique, scalable, un concept en moins à maintenir.
- Une org se définit par **ce qu'elle peut faire** + **comment elle nomme les choses**.

---

## Annexe A — Catalogue des clés de vocab

Issu du scan de code du 2026-08-03. **13 clés cœur + 3 différées.** Défaut = valeur plateforme (cadrage Comply/cabinet) ; exemple = édition régulateur.

### Entité — le terme central
| Clé | Rôle / où | Défaut | Exemple régul |
|---|---|---|---|
| `entity_singular` | Phrases, formulaires, titres de détail (« nouvel **assujetti** ») | entité | assujetti |
| `entity_plural` | Listes, compteurs, sous-titres | entités | assujettis |
| `entities_title` | Item de nav + en-tête page liste + libellé KPI | Entités | Assujettis |
| `entity_with_dem` | Forme démonstrative (« concernant **cet assujetti** »), élision gérée | cette entité | cet assujetti |
| `entity_gender` *(m/f)* | Métadonnée grammaticale → accord FR (un/une, rattaché·e). Remplace `endsWith('e')` | m | m |

### Rôles
| Clé | Rôle / où | Défaut | Exemple régul |
|---|---|---|---|
| `provider_term` | Organisation émettrice/superviseure : nav, dashboards, **tous les emails** | cabinet | régulateur |
| `auditor_term` | Personne qui mène la mission : équipe, signatures email, cartes membres | auditeur | contrôleur |

### Modules
| Clé | Rôle / où | Défaut | Exemple régul |
|---|---|---|---|
| `mission_term` | Unité de travail : nav, titres, portail, emails | Missions | Contrôles |
| `finding_term` | Résultat d'évaluation : pages mesures, drawer contrôle | constat | constat / manquement |
| `measure_term` | Acte émis : pages mesures, compteurs | recommandation | mesure / injonction |

### Portail & présentation
| Clé | Rôle / où | Défaut | Exemple régul |
|---|---|---|---|
| `portal_label` | Nom du portail externe : sidebar portail, en-tête, emails | Portail Client | Portail Assujetti |
| `context_banner` | Bandeau de contexte (titre) — *vide = pas de bandeau* | *(vide)* | Console régulateur |
| `context_banner_sub` | Sous-titre du bandeau, éditable séparément | *(vide)* | Superviseur de conformité cyber |

### Différées / à dériver (mineures)
| Clé | Rôle / où | Note |
|---|---|---|
| `clients_nav_label` | Libellé nav « Clients » (Comply, `/clients`), distinct de `entities_title` | souvent dérivable de `entity_plural` |
| `measures_nav_label` | Libellé composé « Constats & mesures » | dérivable de `finding_term`+`measure_term` (séparateur/ordre variables) |
| `portfolio_label` | « Portefeuille clients » (dashboard cabinet) | Comply-only, faible variance |

### Hors vocab (rappel — reste FIXE)
Types de mesures (`recommandation`/`mise_en_demeure`/`injonction`/`sanction`), statuts, routes (`entityRouteBase`), `logoTag`, `primaryProduct`, objet CAR, marque blanche — enums/routes/branding/domaines, non personnalisables. Les **modules** actifs relèvent des **capacités**, pas du vocab.

### Surfaces à câbler
Front : `src/lib/product.ts` (source vocab), `useVocab.ts`/`EditionContext.tsx` (résolveur → lire `organization_vocab`), `useSidebarNav.tsx` + `AppLayout.tsx` (densité de libellés). Serveur : `supabase/functions/_shared/email-templates.ts`, `reminder.ts`, `car.ts` (aujourd'hui figés « cabinet/auditeur »).
