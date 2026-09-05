# RFC 0007 — Nature des clients : consolidation du modèle, scénarios & trajectoire

> **Statut** : **Accepté — décisions actées le 2026-09-05** · **Portée** : cœur de domaine (organisations, relations, identité, RLS, UX) · **Fondé sur** : [[RFC 0001]] (graphe de relations) mené à son terme.
> **Suite** : bascule des lecteurs sur le graphe (P0), unification de la « partie auditée » (P1), dé-polymorphisation (P2), surface UX unique (P3), retrait des strates mortes (P4).

---

## 0. Pourquoi une nouvelle RFC alors que 0001 existe

RFC 0001 a **correctement diagnostiqué** le problème et a été **accepté** (décisions actées le 2026-07-29). Le socle cible — `organization_relationships` + `organization_capabilities` — a même été **créé en base** (migrations 00156–00164). Mais l'adoption applicative est **partielle** : seul le Hub (`useHubPerspectives`) lit le graphe ; la navigation, les rôles, la création et le portail lisent toujours le legacy (`types[]`, `parent_org_id`, `cabinet_clients`). On vit donc avec **deux sources de vérité** et le pire des deux mondes.

Cette RFC ne réinvente pas le modèle de 0001. Elle **le rend actionnable** : elle ajoute (a) les **primitives manquantes** (tenancy, réconciliation d'identité, consentement, portée de données par arête), (b) une **validation par scénarios de bout en bout**, (c) une **trajectoire d'adoption incrémentale**, et (d) les **décisions ouvertes** à trancher avant de coder.

Références visuelles : [analyse critique](https://claude.ai/code/artifact/900c4be3-74e3-49d0-825d-366aab937cdd) · [23 maquettes de scénarios](https://claude.ai/code/artifact/f1989112-c0f8-4ced-bc74-f9b81b606e6a).

---

## 1. Problème (état des lieux vérifié)

Trois générations de modèle sont **empilées et jamais retirées** :

1. **L'attribut** — `organizations.types[]` ∈ `{cabinet, client, group, platform}` (00094) + `parent_org_id` (00001). La nature est une étiquette. Or `cabinet`/`client` sont des **rôles relatifs**, pas des propriétés.
2. **La fiche** — `cabinet_clients` (00028/00029) : un client est une fiche détenue par un cabinet, avec une **copie complète de l'identité** (nom, secteur, logo…). L'organisation n'est matérialisée que **paresseusement, au 1ᵉʳ lancement de mission** (`client_org_id` nullable).
3. **Le graphe** — `organization_relationships` (00156, natures `self | audit_engagement | group_ownership | regulatory_supervision | delegation`) + `organization_capabilities`. Correct, mais lu par un seul écran.

**Sept problèmes structurels** (tous vérifiés dans le code) :

| # | Problème | Preuve |
|---|---|---|
| 1 | Pas de concept unifié de « partie auditée » | `cabinet_clients` (client Comply) vs `organizations`-enfant (filiale/assujetti) : deux tables disjointes |
| 2 | La nature = un rôle encodé comme attribut | `types[]` ; `parent_org_id` fusionne 3 relations |
| 3 | Identité dupliquée, sans source de vérité | mêmes champs dans `cabinet_clients` et `organizations`, réconciliés au lancement de mission |
| 4 | Empilement historique jamais nettoyé | `types[]`, `parent_org_id`, `entity_type`, `workflow_version`, `home_product`, `capabilities`, `edition`(00160→supprimée 00207) |
| 5 | Deux sources de vérité vivantes | graphe (Hub) vs legacy (nav/rôles/création) |
| 6 | Le vocabulaire dynamique masque l'instabilité | « entité » a 3 sens ; `product.ts` + `organization_vocab` renomment faute de concept stable |
| 7 | La nature n'est ni choisie ni visible au bon moment | création de client sans choix de nature ; nav éclatée `/clients` · `/filiales` · `/assujettis` |

**Symptômes de couplage** : `ClientPortalContact` polymorphe `cabinet_client_id` **XOR** `entity_org_id` (00141) ; `users.client_org_id` référence `cabinet_clients.id` (Comply) **ou** `organizations.id` (Regul) sans contrainte.

---

## 2. Objectifs / non-objectifs

**Objectifs**
- Un **concept unique de « partie auditée »** : toute organisation (client, filiale, assujetti, cabinet) est **un nœud**.
- La nature (cabinet / client / groupe / assujetti) **émerge des arêtes**, jamais stockée.
- Une identité **durable et dédupliquée** ; les relations vont et viennent.
- La **visibilité (RLS)** portée par l'arête × la propriété de la donnée.
- Reconnaître un nœud existant au lieu de le recréer (**réconciliation d'identité**).
- Rendre les rattachements et partages **consentis** (arête à statut).

**Non-objectifs (v1)**
- Refonte de la facturation/plans (cf. [[RFC 0006]]).
- Suppression immédiate de `types[]` / `parent_org_id` (dépréciation progressive, P4).
- Fusion multi-plateforme d'identités entre bases distinctes (chaque instance reste souveraine).

---

## 3. Primitives du modèle

### 3.1 Nœud
Une organisation réelle = **un** enregistrement `organizations`, avec l'identité **intrinsèque** seule : `id, name, registration_number, sector, country, …`. Clé de déduplication : `registration_number` (RCCM / NINEA…). Aucun rôle relationnel dans l'entité.

### 3.2 Tenancy
Fait, **orthogonal**, qu'un nœud **utilise** la plateforme : il a un workspace, des utilisateurs, un abonnement (capacités [[RFC 0002]] / [[RFC 0006]]). Un nœud peut n'être **que** l'objet d'un audit (pas de tenancy). « Devenir client puis locataire » = **attacher une tenancy au même nœud**.

### 3.3 Arêtes typées (`organization_relationships`)
Chaque arête relie un **`actor_org_id`** à un **`target_org_id`**, avec une **nature** et un **statut**. *Schéma réel (mig 00156)* : `status ∈ {active, ended, suspended}` (défaut `active`) — c'est `active` qui fait foi (cf. `useHubPerspectives`). Le handshake « proposé → confirmé » (§4.2) **n'existe pas encore** : il exigera d'étendre ce statut (à cadrer avant le consentement).
- `audit_engagement` : auditeur → audité, **liée à une mission**, **datée** (`missions.engagement_id`, 00156).
- `group_ownership` : parent → filiale.
- `regulatory_supervision` : régulateur → assujetti.
- `self` : la tenancy d'un nœud (son propre espace).

### 3.4 Portée des données par arête (le point critique)
La RLS se clé sur **appartenance à l'arête × propriété de la donnée**, jamais sur « même org = tout voir » :

| Domaine de donnée | Propriétaire | Qui d'autre y accède |
|---|---|---|
| Identité (nom, n°) | le nœud | tous ceux qui ont une arête vers lui |
| Profil d'organisation (structure, effectifs, IT, parties prenantes) | le nœud (l'org une fois revendiquée) | un auditeur/superviseur via son arête (consentement) |
| Contexte d'engagement (référentiel, périmètre, constats) | l'engagement | l'audité (livrables) |
| Dossier d'audit (workpapers) | l'engagement (le cabinet) | personne d'autre |
| Livrable (rapport PDF) | l'engagement | l'audité ; un tiers **sur accord de l'audité** |
| Soumissions réglementaires | la relation de supervision | le régulateur |
| Espace de conformité privé | la tenancy | personne d'autre |

---

## 4. Les trois chantiers structurants

Le graphe rend tout **représentable** ; ces trois mécanismes le rendent **suffisant**. Ce sont eux le vrai travail.

### 4.1 Réconciliation & revendication d'identité
Quand une organisation s'onboarde (comme locataire, ou ajoutée par un autre cabinet/régulateur), on **cherche un nœud existant** par `registration_number` :
- **Match** → flux de **revendication** : vérification (e-mail au domaine, justificatif d'immatriculation, contre-signature optionnelle du cabinet auditeur) → la tenancy/relation se rattache au **nœud existant**, sans doublon.
- **Pas de match** → nouveau nœud.
- Tant qu'un nœud n'est pas revendiqué, l'identité fournie par un tiers (cabinet) est **provisoire** ; après revendication, l'organisation en devient **propriétaire**.

### 4.2 Consentement / autorité (arêtes à statut)
Une arête sensible naît `proposed` et devient `confirmed` après acceptation :
- **Rattachement de filiale** : le groupe propose `group_ownership` ; la filiale (ou un admin) confirme. Aucune donnée déplacée avant confirmation.
- **Partage inter-engagements** : un nouveau cabinet ne voit **jamais** automatiquement le dossier d'un prédécesseur ; l'audité autorise le partage du livrable.
- **Supervision réglementaire** : le rapprochement crée `regulatory_supervision` sans donner accès aux autres rôles de l'entité.

### 4.3 Matrice de confidentialité (RLS)
La RLS combine : (1) l'utilisateur appartient à une org reliée par une arête `confirmed` d'un type donné ; (2) la donnée visée appartient à ce type d'arête (ou est publique au nœud). Les helpers `SECURITY DEFINER` (`get_my_organization_id` ; `my_related_org_ids` — 00158 ; `visible_target_ids` — 00162, l'équivalent graphe de `get_subsidiary_ids`, **non encore branché en RLS**) sont étendus par type d'arête. **Aucune récursion** (les policies d'une table ne s'auto-interrogent pas ; cf. règle projet).

---

## 5. Scénarios de bout en bout

Notation : `A —engage(M)→ X` (audit), `G —owns→ F`, `R —supervise→ E`. « tenant » = a un workspace.

1. **Cabinet audite son client.** `[A]` tenant `—engage(M1)→` `[X]` (nœud seul). A voit M1 + le portail de X. Rôle « client » = l'arête.
2. **Cabinet audite un groupe.** `G —owns→ G1, G2` (préexistant) ; `A —engage(M1)→ G` avec G1/G2 **composants** (ISA 600). Consolidation par roll-up. La structure survit aux missions.
3. **Groupe audite ses filiales.** `[G]` **tenant** `—owns→ G1, G2`. Même graphe, acteur = le groupe (oversight). « Qui audite » = direction de l'arête + tenancy, pas une colonne.
4. **Filiale seule, puis le groupe rejoint (organisation).** `[G1]` préexiste ; `[G]` arrive → `G —owns(proposed)→ G1` → G1 confirme. Additif, tardif, aucune migration.
5. **… puis le groupe rejoint comme client d'un cabinet.** C onboarde G ; G1 **reconnu** en composant, **notifié**, `A/C` ne voit que le **périmètre-composant** — pas l'espace privé de G1.
6. **Ancien client → sa conformité.** `[X]` = objet d'un `A —engage→ X` passé, sans tenancy. X **revendique** → **tenancy attachée au même nœud**. X voit son espace privé + les livrables passés ; pas les workpapers de A.
7. **Ancien groupe → sa conformité.** Comme 6, mais `[G]` a déjà ses arêtes `owns` (créées pendant l'audit) → **réutilisées** pour la supervision. Zéro reconstruction.
8. **Régulateur gère ses entités.** `[R]` tenant `—supervise→ E1, E2`. Import + rapprochement des nœuds existants.
9. **Régulateur + entités auditées/autonomes.** `[E1]` porte **trois faits** : `R —supervise→`, `A —engage→`, tenancy propre. Un nœud, trois portées cloisonnées (§3.4). **Impossible à représenter proprement avec le modèle à 2 tables actuel.**
10. **Client audité par A (2024) puis B (2026).** `[X]` unique ; `A —engage(M1)→` et `B —engage(M2)→`, **murés**. B **reconnaît** le nœud (pas de doublon). Partage du rapport 2024 = **sur accord de X**.

---

## 6. UX cible

- **Une seule surface « Comptes »** : clients, groupes, filiales, assujettis dans une liste hiérarchique repliable. La position dans l'arbre **est** la nature. `/clients`, `/filiales`, `/assujettis` deviennent des **vues filtrées**.
- **Un flux de création unique** : « Ajouter un compte » → nom + **forme** (entreprise simple / groupe). Le **rôle** se déduit du contexte (un cabinet qui ajoute crée un engagement). Aucune nature à déclarer.
- **Hiérarchie manipulable** : rattacher/promouvoir par « rattacher à », pas via un module séparé (`manage-entity`).
- **Rôle affiché, jamais demandé** : « Client · audité par vous », « Groupe · 4 filiales », « Assujetti · supervisé » — dérivés des arêtes.
- **Vocabulaire stable** : le concept s'appelle « compte / organisation » ; « assujetti / filiale » restent des **libellés d'édition** (`organization_vocab`) posés sur un concept qui ne bouge plus.

---

## 7. Trajectoire d'adoption (par soustraction, incréments compatibles)

| Phase | Objet | Risque |
|---|---|---|
| **P0** | Faire du graphe la **source de lecture** : migrer `useOrganizationHierarchy`, `organization-utils`, la nav pour dériver le rôle des arêtes (comme le Hub). `types[]` devient **dérivé**. | Faible |
| **P1** | **Unifier la partie auditée** : un client devient une `organizations` dès la création (fin de la matérialisation paresseuse) ; les champs métier de `cabinet_clients` migrent en **profil d'engagement/nœud** ; la table devient une arête `audit_engagement`. | Moyen |
| **P2** | **Dé-polymorphiser** : `ClientPortalContact` et `users.client_org_id` pointent vers **une** organisation. Le XOR et le double-ciblage disparaissent. | Moyen |
| **P3** | **Fusionner les surfaces UX** : « Comptes » hiérarchique + création avec forme + revendication d'identité + rattachement consenti. | Moyen (UX) |
| **P4** | **Retirer les strates mortes** : déprécier `types[]`, `parent_org_id`, `entity_type` une fois tous les lecteurs migrés. | Nettoyage |

Chaque phase est livrable seule et réversible. La **réconciliation d'identité (§4.1)** est un prérequis de P1–P3 : à cadrer en tête.

> **État P0 (2026-09-05)**
> - **P0.1 — LIVRÉ** : `isGroup` dérivé du graphe (arête `group_ownership` active) avec repli `types[]`, via le hook `useOrgRoles`. Bascule de `useOrganizationHierarchy`, `useSidebarNav`/`useGroupPermissions`/`SupervisionPage`/`RoleManagementModal` (transparente), `DashboardPage`, `useMissionCreateForm`. Aucune régression (OR avec le legacy).
> - **P0.2 — prérequis découverts** : le graphe **n'est pas pleinement maintenu**. Il manque (1) un trigger `audit_engagement` sur `missions`/`cabinet_clients` (les clients post-backfill n'ont pas d'arête → `isCabinet`/`isClient` non dérivables), (2) un trigger de **re-parentage** (`AFTER UPDATE OF parent_org_id`, le sync actuel est INSERT-only). À poser avant d'élargir la dérivation au-delà de `isGroup`.
> - **Hors P0** : lecteurs couplés RLS (`get_subsidiary_ids` → attendent la bascule des policies vers `visible_target_ids`) ; `platform`/quotas, `entity_type`, admin, écrivains `types[]` → P4.

---

## 8. Décisions actées (2026-09-05)

### 8.1 Champs métier riches — **split nœud / arête, avec snapshot probant**
- **Profil d'organisation (durable) → sur le nœud** : effectifs, chiffre d'affaires, nombre de sites, structure hiérarchique, environnement & systèmes IT, parties intéressées structurelles. Saisi une fois, affiné dans le temps ; **propriété de l'organisation** dès qu'elle a revendiqué son nœud (provisoire, saisi par le cabinet, avant revendication).
- **Contexte d'engagement (par mission) → sur l'arête `audit_engagement`** : référentiel(s) et exigences retenus, périmètre, notes et constats de la mission.
- **Snapshot point-in-time** : à l'ouverture d'une mission, les champs de profil pertinents sont **copiés en lecture seule sur l'engagement** (valeur probante — l'audit atteste de l'état à sa date) ; le profil vivant continue d'évoluer sur le nœud.
- *Justification par les cas limites* : (a) **client récurrent** (plusieurs missions/an) → le profil durable est réutilisé d'une mission à l'autre, chaque mission n'ajoutant que son scope + son snapshot ; (b) **client déjà locataire** → l'organisation possède son profil, le cabinet le **lit** (via l'engagement, avec consentement) et capture son propre contexte sur l'arête — sans duplication ni écrasement.

### 8.2 Forme — **attribut explicite léger**
`organizations.shape ∈ {simple, group}` déclaré à la création (façon Record Type). La présence d'arêtes `group_ownership` le **confirme** (une forme `simple` qui reçoit une filiale bascule en `group`). Une seule dimension de nature assumée.

### 8.3 Dépréciation de `types[]` — **action préalable à P0**
Inventaire exhaustif des lectures `types[]` / `parent_org_id` / `entity_type` dans le code avant P0. Le retrait (P4) est **conditionné à zéro lecteur restant**.

### 8.4 Réconciliation d'identité — **action de cadrage en tête de P1**
Clé de déduplication = `registration_number`. Preuves acceptées : e-mail au domaine (obligatoire) · justificatif d'immatriculation (revue manuelle) · contre-signature du cabinet auditeur (optionnelle). Le workflow de revendication (états, qui valide) est spécifié avant P1.

---

## 9. Impact, sécurité, RLS

- **Sécurité** : le cloisonnement se **renforce** (mur par arête vs « même org »). Réutilise les helpers `SECURITY DEFINER` existants ; pas de récursion RLS. Le partage inter-acteurs est **explicitement consenti**.
- **Migration de données** : additive. Le backfill graphe existe déjà (00157) ; P1 étend `cabinet_clients` → arête + profil sans perte.
- **Compatibilité** : `types[]` reste dérivé jusqu'à P4 ; aucune rupture pour les écrans non encore migrés.
- **Risque global** : **moyen** — brassage du cœur de domaine, mais socle déjà en base, phases isolées et réversibles.

---

## 10. Références

- [[RFC 0001]] — Modèle relationnel des organisations (graphe) — **accepté, à appliquer**.
- [[RFC 0002]] — Éditions & capacités v2 (modules à la carte).
- [[RFC 0006]] — Modèle d'abonnements (branche les capacités/tenancy).
- Migrations socle : `00156` (graphe : `actor_org_id`/`target_org_id`, `status active|ended|suspended`), `00157` (backfill), `00158` (`my_related_org_ids`), `00162` (`visible_target_ids`), `00164`/`00206` (sync `sync_org_parent_edge`).
- Artifacts : [analyse critique](https://claude.ai/code/artifact/900c4be3-74e3-49d0-825d-366aab937cdd) · [maquettes des scénarios](https://claude.ai/code/artifact/f1989112-c0f8-4ced-bc74-f9b81b606e6a).
