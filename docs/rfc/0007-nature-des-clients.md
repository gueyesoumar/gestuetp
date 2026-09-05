# RFC 0007 — Nature des clients : consolidation du modèle, scénarios & trajectoire

> **Statut** : **Proposé** · **Portée** : cœur de domaine (organisations, relations, identité, RLS, UX) · **Fondé sur** : [[RFC 0001]] (graphe de relations) mené à son terme.
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
Chaque arête a une **nature** et un **statut** (`proposed | confirmed | revoked`) :
- `audit_engagement` : auditeur → audité, **liée à une mission**, **datée** (`missions.engagement_id`, 00156).
- `group_ownership` : parent → filiale.
- `regulatory_supervision` : régulateur → assujetti.
- `self` : la tenancy d'un nœud (son propre espace).

### 3.4 Portée des données par arête (le point critique)
La RLS se clé sur **appartenance à l'arête × propriété de la donnée**, jamais sur « même org = tout voir » :

| Domaine de donnée | Propriétaire | Qui d'autre y accède |
|---|---|---|
| Identité (nom, n°) | le nœud | tous ceux qui ont une arête vers lui |
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
La RLS combine : (1) l'utilisateur appartient à une org reliée par une arête `confirmed` d'un type donné ; (2) la donnée visée appartient à ce type d'arête (ou est publique au nœud). Les helpers `SECURITY DEFINER` (`get_my_organization_id`, `visible_target_ids` — 00158) sont étendus par type d'arête. **Aucune récursion** (les policies d'une table ne s'auto-interrogent pas ; cf. règle projet).

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

---

## 8. Décisions à trancher (avant de coder)

1. **Champs métier riches d'un client** (parties intéressées, exigences réglementaires actuellement dans `cabinet_clients`) : logent-ils sur le **nœud** (attributs de l'org) ou sur l'**arête d'engagement** (spécifiques à un audit) ? *Recommandation : sur l'arête d'engagement — ce sont des données de mission, pas d'identité.*
2. **Attribut de forme** : garde-t-on un champ explicite `shape` (`simple | group`) façon Record Type, ou le dérive-t-on de la présence d'arêtes `group_ownership` ? *Recommandation : attribut explicite léger (déclaré à la création), la présence d'arêtes le confirmant.*
3. **Séquence de dépréciation de `types[]`** : combien de lecteurs restent après P0, et lesquels bloquent le retrait (P4) ? *Action : inventaire exhaustif des lectures `types[]` / `parent_org_id` / `entity_type` avant P0.*
4. **Force de la réconciliation d'identité** : le `registration_number` est-il fiable/obligatoire sur toutes les instances (Sénégal, etc.) ? Quelle procédure de vérification minimale (§4.1) ? *Action : définir les preuves acceptées et le workflow de revue.*

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
- Migrations socle : `00156` (graphe), `00157` (backfill), `00158` (traversée), `00164` (sync).
- Artifacts : [analyse critique](https://claude.ai/code/artifact/900c4be3-74e3-49d0-825d-366aab937cdd) · [maquettes des scénarios](https://claude.ai/code/artifact/f1989112-c0f8-4ced-bc74-f9b81b606e6a).
