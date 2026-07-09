# Contexte métier & vision — Gëstu ETP

> Document préparé pour l'audit externe. Version du 2026-07-09.
> Objectif : donner à l'auditeur **le « pourquoi »** de la plateforme — le problème métier, les acteurs, et les logiques du domaine (audit de conformité, régulation cyber) — avant d'aborder le « quoi » (dossier fonctionnel) et le « comment » (architecture, sécurité). À lire **en premier**.

---

## 1. Le problème métier

Gëstu ETP répond à **deux problèmes voisins mais distincts**, tous deux ancrés dans la conformité et la sécurité des systèmes d'information.

### 1.1 Problème A — conduire des audits de conformité (Gëstu Comply)

Un **audit de conformité SI** consiste à vérifier qu'une organisation respecte un **référentiel** (ISO 27001, PSSI, réglementation sectorielle bancaire, RGPD…). Aujourd'hui, ce travail est massivement conduit avec des tableurs et des documents dispersés. Les difficultés récurrentes :

- **Dispersion** : questionnaires, preuves, constats et rapports éclatés entre e-mails, Excel et dossiers partagés.
- **Traçabilité faible** : qui a évalué quoi, quand, sur quelle preuve ? Difficile à reconstituer.
- **Multi-référentiels** : une même organisation est auditée sur plusieurs cadres ; pas de socle commun.
- **Collaboration client friable** : l'entité auditée doit fournir des preuves, valider des constats — un aller-retour mal outillé.
- **Restitution coûteuse** : produire un rapport d'audit propre et un plan d'action prend un temps disproportionné.

Gëstu Comply industrialise ce cycle : un **moteur d'audit** unique, multi-référentiels, collaboratif (cabinet ↔ client), avec traçabilité native et restitution automatisée.

### 1.2 Problème B — superviser un parc d'entités régulées (Gëstu Regul)

Une **autorité de régulation cyber** (ex. la DCSSI au Sénégal) ne pilote pas *sa* conformité : elle **supervise la conformité d'un parc d'organisations tierces** (les « assujettis »), avec un **pouvoir contraignant**. Ses besoins sont d'une autre nature :

- **Vision de parc** (1-à-N) : des dizaines/centaines d'assujettis, avec des niveaux de criticité différents.
- **Actes juridiques gradués** : au-delà du constat, l'autorité peut recommander, mettre en demeure, enjoindre, sanctionner.
- **Notification d'incidents** : les assujettis doivent déclarer leurs incidents cyber dans des délais réglementaires.
- **Valeur probante** : les actes de l'autorité doivent être **inattaquables** (horodatés, non falsifiables) car ils peuvent avoir des conséquences juridiques.
- **Souveraineté** : les données d'un régulateur d'État ne peuvent pas cohabiter avec des données commerciales.

Gëstu Regul réutilise le moteur d'audit de Comply mais l'oriente vers cette **posture de supervision contraignante**.

---

## 2. Les acteurs (et ce qu'ils cherchent)

| Acteur | Contexte | Ce qu'il cherche |
|---|---|---|
| **Cabinet d'audit** (Comply) | Réalise des missions pour ses clients | Industrialiser ses audits, gagner du temps, produire des livrables fiables et traçables |
| **Chef de mission / associé** | Pilote et garantit la qualité d'une mission | Répartir le travail, revoir, garantir la cohérence avant restitution |
| **Auditeur terrain** | Évalue des contrôles précis | Un cadre guidé pour évaluer, documenter, justifier |
| **Client audité** (Comply) | Entité auditée | Fournir ses preuves, comprendre et valider/contester les constats, suivre son plan d'action |
| **Autorité de régulation** (Regul) | Supervise un secteur | Connaître la posture du parc, prioriser ses contrôles, prononcer des actes, suivre les incidents |
| **Assujetti** (Regul) | Entité régulée | Répondre aux contrôles, déclarer ses incidents, suivre ses obligations — dans un espace strictement privé |
| **Éditeur / super-admin** | Exploite la plateforme | Gérer les cabinets, les référentiels, la facturation, superviser techniquement |

La **relation de confiance asymétrique** (un tiers évalue / supervise une organisation) est le cœur du métier : elle impose que chaque partie ne voie **que** ce qui la concerne. C'est la raison d'être du cloisonnement (§8).

---

## 3. La vision « ETP »

Gëstu **ETP** (le portail-socle) n'est pas un produit unique mais une **famille de produits** partageant un même moteur : conformité (Comply), régulation (Regul), et à terme d'autres (risque, politique, sensibilisation, protection des données, qualité). L'idée directrice :

> **Un socle commun (audit, référentiels, cloisonnement, traçabilité) ; des produits qui réorientent ce socle vers un métier précis.**

Cette logique explique la plupart des décisions techniques (voir §9) : on ne réécrit pas le moteur d'audit pour chaque métier, on le **spécialise par configuration et vocabulaire**.

---

## 4. Le vocabulaire du domaine (glossaire raisonné)

Comprendre ces concepts et **leurs relations** suffit à comprendre 90 % de la plateforme.

- **Référentiel** (*framework*) : un cadre normatif structuré en **domaines** puis en **contrôles**. C'est l'unité de mesure de la conformité (ex. PSSI-ES : 11 domaines, 213 contrôles).
- **Contrôle** : une exigence vérifiable (« les accès sont revus périodiquement »). L'audit consiste à statuer sur chaque contrôle.
- **Mission** : un audit daté, sur un référentiel, pour une organisation, mené par une équipe. Elle traverse des **phases** (cadrage → … → clôture).
- **Évaluation** (*assessment*) : le jugement porté sur un contrôle dans une mission, avec un **niveau de conformité** et des **preuves**.
- **Constat** (*finding*) : ce que l'audit relève sur un contrôle — non-conformité majeure/mineure, observation, ou point fort. C'est la matière du rapport et du plan d'action.
- **Preuve** (*evidence*) : un document/élément justifiant l'évaluation. Une preuve absente peut devenir un constat.
- **Conformité** : le degré de respect (Conforme / Largement / Partiellement / Non conforme / N-A), agrégé en **score**.
- **Plan d'action** : les actions correctives suivies après l'audit.
- *(Regul)* **Assujetti** : une organisation soumise à la supervision de l'autorité.
- *(Regul)* **Criticité** : l'importance d'un assujetti pour décider de l'intensité de la supervision (échelle neutre & configurable).
- *(Regul)* **Mesure** : un acte de l'autorité, **gradué** (recommandation → mise en demeure → injonction → sanction).
- *(Regul)* **Incident** : un événement cyber que l'assujetti doit déclarer, avec des **échéances** de notification.
- *(Regul)* **Journal probant** : la trace inaltérable de tous les actes de l'autorité.

**Fil conducteur** : `Référentiel → Contrôles → (Mission) Évaluations → Constats → Rapport → Plan d'action`. En Regul, la chaîne se prolonge : `Constats → Mesures graduées` et, en parallèle, `Incidents`, le tout **ancré dans le journal probant**.

---

## 5. La logique du cycle d'audit (pourquoi ces étapes)

Le cycle n'est pas arbitraire : il reproduit la **méthodologie d'audit professionnelle**, où chaque étape réduit un risque.

1. **Cadrage** — *pourquoi* : on ne peut pas auditer « tout ». On délimite le périmètre, on identifie les risques et on interroge l'organisation (questionnaire) pour cibler l'effort.
2. **Planification** — *pourquoi* : répartir les contrôles selon le risque et affecter les bons auditeurs ; l'audit doit être **proportionné** (plus d'effort là où le risque est élevé).
3. **Travaux** — *pourquoi* : c'est le cœur probant — évaluer chaque contrôle sur pièces (preuves), pas sur déclaration seule.
4. **Revue interne** — *pourquoi* : un second regard (le chef de mission) garantit la **qualité et la cohérence** avant d'exposer quoi que ce soit au client. Principe du « quatre yeux ».
5. **Validation client** — *pourquoi* : l'entité auditée a le droit de **comprendre et contester** les constats (contradictoire) ; cela fiabilise le rapport et responsabilise le client.
6. **Clôture** — *pourquoi* : figer le résultat (score, rapport) et enclencher la remédiation (plan d'action).

La distinction des **rôles** (auditeur terrain restreint à ses contrôles ; lead/associé qui pilotent et revoient) traduit cette logique de séparation des responsabilités et de contrôle qualité.

---

## 6. La logique de conformité & de scoring

- Statuer contrôle par contrôle évite le jugement global impressionniste : le score **émerge** des évaluations élémentaires.
- Les **niveaux** (au-delà du binaire conforme/non-conforme) reflètent la réalité : une exigence peut être partiellement satisfaite.
- L'**agrégation par domaine puis global** donne une lecture actionnable (où concentrer les efforts), avec des seuils (≥80 / ≥60 / <40) qui traduisent un feu vert/orange/rouge.
- La **cohérence constats ↔ conformité** (règle vérifiée à la soumission) empêche les incohérences (« conforme » mais avec une non-conformité majeure).

---

## 7. La logique du régulateur (Regul)

- **Vision de parc (1-à-N) & priorisation** : l'autorité a des ressources limitées ; elle doit concentrer ses contrôles là où l'enjeu est le plus fort (un assujetti **très critique et peu conforme** = priorité). D'où le tableau de bord « posture » et la cartographie criticité × conformité.
- **Gradation des mesures = proportionnalité juridique** : on ne sanctionne pas d'emblée. L'échelle recommandation → mise en demeure → injonction → sanction reflète le principe de **proportionnalité** de l'action publique ; l'escalade doit toujours viser un niveau supérieur.
- **Incidents & délais** : la déclaration d'incident dans des délais est une obligation réglementaire classique en cybersécurité. Les échéances sont **figées à la déclaration** (le compteur part de la détection) et **paramétrables** (le droit sénégalais n'étant pas encore figé, on ne code pas le délai « en dur »).
- **Valeur probante = journal chaîné par hash** : un acte réglementaire peut être contesté juridiquement. Le journal `probative_log` est **append-only** et **chaîné par hash** : toute modification a posteriori casse la chaîne (détectable). C'est l'équivalent numérique d'un registre paraphé et non raturable.
- **Souveraineté = instance dédiée** : les données d'un régulateur d'État sont isolées physiquement des données commerciales (instance Supabase séparée).

---

## 8. Pourquoi le cloisonnement est central (et non un détail technique)

Le métier repose sur une **confiance asymétrique** : un tiers (cabinet, autorité) accède à des informations sensibles d'une organisation. Si un cabinet voyait les données d'un autre, ou un assujetti celles d'un autre, **la plateforme perdrait sa raison d'être**. Le cloisonnement n'est donc pas une contrainte de sécurité ajoutée après coup : c'est **une exigence métier fondatrice**. Elle se traduit techniquement par la RLS multi-tenant, les portails cloisonnés, et l'isolation des instances (détaillé dans le dossier sécurité).

---

## 9. Pourquoi un codebase unique, deux produits (logique au service du métier)

- **Anti-divergence** : Comply et Regul partagent le même métier de fond (référentiels, contrôles, évaluations, cloisonnement, traçabilité). Les faire diverger en deux bases distinctes multiplierait les bugs et les coûts. On garde **un moteur**, spécialisé par `VITE_PRODUCT`.
- **Souveraineté sans fork** : le code est commun, mais Regul tourne sur une **instance dédiée** — on concilie mutualisation du logiciel et séparation des données.
- **Réutilisation intelligente** : l'assujetti régulé réutilise le mécanisme du « client portail » ; l'organe régulateur réutilise le mécanisme « groupe/entités ». Le net-nouveau se limite au spécifique régulateur (mesures, incidents, journal probant).

---

## 10. Décisions métier structurantes (et leur justification)

| Décision | Pourquoi |
|---|---|
| **Modèle centré constats** (N constats par évaluation) | Un contrôle peut soulever plusieurs points distincts, chacun avec sa gravité et sa recommandation — plus fidèle qu'un jugement unique. |
| **Liaison question ↔ contrôle** | Les réponses de cadrage alimentent l'évaluation : on ne redemande pas ce que le client a déjà déclaré, et on trace le lien. |
| **Portail par comptes (pas de lien anonyme)** | Traçabilité et responsabilité : chaque action côté client/assujetti est rattachée à une identité. |
| **Criticité neutre & configurable** | Ne pas figer une terminologie réglementaire (ex. « OIV ») tant que le cadre juridique cible n'est pas arrêté ; le libellé se change en un point. |
| **Échéances d'incident paramétrables** | Le droit de notification varie selon les juridictions ; on rend la règle configurable plutôt que codée. |
| **Actes ancrés au journal probant** | Donner une valeur juridique opposable aux décisions du régulateur. |

---

## 11. Du métier à la sécurité (fil conducteur)

Chaque exigence métier se traduit par un choix de sécurité, documenté dans le dossier dédié :

| Exigence métier | Traduction sécurité |
|---|---|
| Confiance asymétrique / confidentialité | Cloisonnement RLS multi-tenant, portails cloisonnés |
| Souveraineté des données d'État | Instance Supabase dédiée (Regul) |
| Valeur probante des actes | Journal append-only chaîné par hash, immuable |
| Responsabilité des actions | Comptes nominatifs, journaux d'audit |
| Proportionnalité & rôles | RBAC, séparation des responsabilités, gardes serveur |

C'est pourquoi l'audit de sécurité de cette plateforme est indissociable de la compréhension de son métier : les contrôles techniques **découlent** des exigences métier ci-dessus.

---

*Suite recommandée : `01-dossier-fonctionnel.md` (le « quoi »), puis `02-architecture-technique.md` et `03-dossier-securite.md` (le « comment »).*
