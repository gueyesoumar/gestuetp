# Dossier fonctionnel — Gëstu ETP

> Document préparé pour l'audit externe (volet fonctionnel). Version du 2026-07-09.
> Périmètre : plateforme **Gëstu ETP** — socle partagé + produits **Comply** et **Regul**.
> Rédigé à partir d'un inventaire du code réel (routes, modules, permissions). Certains comportements dépendent de *feature flags* / du plan de l'organisation ; ils sont signalés.

---

## 1. Vue d'ensemble

**Gëstu ETP** est une plateforme SaaS multi-tenant de conformité et d'audit SI, déclinée en **deux produits** issus d'un **codebase unique** (sélection au build via `VITE_PRODUCT`).

| Produit | Public | Modèle relationnel | Instance Supabase |
|---|---|---|---|
| **Gëstu Comply** (défaut) | Cabinets d'audit & organisations auditant leur conformité | 1 cabinet ↔ N clients (introspectif) | `jibblzpownddlodzmewj` |
| **Gëstu Regul** (`VITE_PRODUCT=regul`) | Autorité de régulation cyber (DCSSI Sénégal) | 1 régulateur ↔ N assujettis, pouvoir contraignant | `snayznxraupndrdmhbak` (dédiée) |

Aiguillage racine (`src/App.tsx`) : `{isRegul ? <RegulApp/> : <ComplyRoutes/>}`. Vocabulaire adapté via `productVocab` (`src/lib/product.ts`) : *client → assujetti*, *filiales → assujettis*, route `/filiales → /assujettis`, tag logo, libellés de portail.

---

## 2. Rôles & modèle d'autorisation

### 2.1 Rôles applicatifs (`users`)

| Rôle | Champ | Portée |
|---|---|---|
| Super-admin plateforme | `is_platform_owner = true` | Console `/admin` ; override de toutes les permissions cabinet |
| Membre cabinet / auditeur | `role = 'auditor'` | Back-office (missions, référentiels, clients…) |
| Client / assujetti | `role = 'client'` | Portail cloisonné `/client/*` |

Le **régulateur** n'est pas un rôle distinct : c'est un membre `auditor` d'une organisation de type `group` (Regul). Le cloisonnement se fait par le type d'organisation et le sous-arbre.

### 2.2 Rôles au niveau mission (`mission_members.role`)

| Rôle mission | Rôle | Accès |
|---|---|---|
| `lead_auditor` | Chef de mission (1/mission) | Pilote toutes les phases, revue interne, clôture |
| `associate` | Responsable qualité (optionnel) | Revue interne, validation |
| `auditor` | Auditeur terrain (N/mission) | Restreint à **ses** contrôles affectés (Travaux/Clôture) |

Résolution : `useMissionUserRole`. Les auditeurs « terrain » ne voient pas les onglets Cadrage/Planification/Revue.

### 2.3 Permissions cabinet (RBAC granulaire)

Portées par `platform_roles` ↔ `user_platform_roles`, agrégées en OU, évaluées côté serveur (RPC `user_has_cabinet_permission`, fail-closed). `is_platform_owner` = tout à `true`.

| Permission | Action / écran gardé |
|---|---|
| `can_create_mission` | Créer une mission |
| `can_designate_lead` | Désigner un chef de mission |
| `can_be_lead` | Être éligible chef de mission |
| `can_assign_team` | Affecter l'équipe / les contrôles |
| `can_manage_members` | Gérer les membres du cabinet |
| `can_manage_clients` | Gérer la base clients |
| `can_manage_roles` | CRUD des rôles plateforme |
| `can_edit_organization` | Éditer l'organisation (branding, domaine) |
| `can_delete_mission` | Supprimer une mission |

### 2.4 Permissions groupe / supervision

Pour les organisations de type `group` (repli : `true` pour un cabinet classique).

| Permission | Action |
|---|---|
| `can_view_supervision` | Voir le dashboard de supervision / heatmap |
| `can_create_campaign` | Créer une campagne d'audit multi-entités |
| `can_manage_subsidiaries` | Gérer les entités / assujettis |
| `can_view_entity_detail` | Voir le détail d'une entité (scores, historique) |

### 2.5 Vues de tableau de bord

Un rôle peut exposer des vues : `executive`, `pilotage`, `operationnel` (champ `dashboard_views`, avec une vue par défaut).

---

## 3. Cartographie des routes

### 3.1 Comply — back-office cabinet

| Domaine | Routes | Rôle |
|---|---|---|
| Auth | `/login`, `/set-password` | public |
| Hub / compte | `/hub`, `/compte` | authentifié |
| Tableau de bord | `/` (dashboard cabinet) | staff |
| Missions | `/missions`, `/missions/nouvelle` (assistant 6 étapes), `/missions/:id` (détail multi-onglets) | staff |
| Clients | `/clients`, `/clients/nouveau`, `/clients/:id` | `can_manage_clients` |
| Référentiels | `/referentiels` (frameworks/domaines/contrôles, comparaison) | staff |
| Questionnaire | `/questionnaire/:id` | staff |
| Membres / Organisation | pages membres, rôles, paramètres organisation | `can_manage_members` / `can_edit_organization` |
| Supervision & groupe | dashboard supervision, campagnes, entités/`/filiales`, `/filiales/:id` | perms groupe |
| Notifications / Support | `/notifications`, centre d'aide | authentifié |

### 3.2 Comply — portail client (`/client/*`)

| Route | Contenu |
|---|---|
| `/client` | Tableau de bord (statut missions, KPIs conformité) |
| `/client/missions`, `/client/missions/:id` | Missions accordées (timeline, questionnaire, documents, observations, plan d'action, rapports) |
| `/client/documents` | Dépôt / consultation de documents |
| `/client/notifications` | Notifications |
| `/client/aide` | Centre d'aide (bug / demande / suggestion) |

### 3.3 Comply — super-admin (`/admin/*`)

Cabinets, utilisateurs, référentiels plateforme, plans/tarification, monitoring (usage IA, coûts), support, journal d'audit admin. Toutes gardées par `AdminProtectedRoute` + `requirePlatformOwner` côté backend.

### 3.4 Regul — console régulateur

| Route | Module |
|---|---|
| `/` | M8 Pilotage & posture (tableau de bord) |
| `/assujettis`, `/assujettis/:id` | M1 Registre assujettis + profil réglementaire |
| `/controles`, `/controles/nouvelle`, `/controles/:id` | M3 Missions de contrôle |
| `/constats` | M4 Constats & mesures graduées |
| `/incidents` | M5 Incidents |
| `/referentiels` | M6 Référentiels |
| `/compte` | Compte |

### 3.5 Regul — portail assujetti (`/client/*`)

Tableau de bord, mes missions, **incidents** (auto-déclaration, M5-2), documents, notifications, aide.

---

## 4. Cycle de vie d'une mission (Comply)

Statuts (`missions.status`) : `initialization → scoping → planning → fieldwork → internal_review → client_review → closure`.

Le détail de mission est organisé en **onglets par phase** (certains réservés au lead/associé) :

| Phase | Onglet | Activités | Artefacts |
|---|---|---|---|
| **Cadrage** (scoping) | Cadrage *(lead/associé)* | Périmètre, objectifs, questionnaire client, risques initiaux, exclusions, parties prenantes | Note de cadrage (PDF) |
| **Planification** (planning) | Planification *(lead/associé)* | Sélection domaines/contrôles, niveau de risque & techniques d'audit, affectation des auditeurs, matrice d'entretiens, calendrier, demandes de preuves | Programme de travail |
| **Travaux** (fieldwork) | Travaux *(tous)* | Évaluation des contrôles (observer → documenter → analyser), collecte de preuves, création de constats | `control_assessments`, `assessment_findings` |
| **Revue interne** | Revue interne *(lead/associé)* | Approbation / rejet des évaluations | `assessment_validations` (piste d'audit) |
| **Validation client** | Validation client *(lead/associé)* | Envoi au client, approbation / contestation, observations | Observations client |
| **Clôture** | Clôture *(tous)* | Calcul du score de conformité, génération des rapports | Rapport d'audit, plan d'action |
| (transverse) | Plan d'action *(tous)* | Suivi des actions correctives | CAR (corrective actions) |

### 4.1 Évaluation d'un contrôle

Statuts (`control_assessments.status`) : `draft → submitted → in_review → approved | rejected`.
- L'auditeur affecté rédige (draft) puis soumet (submitted).
- Le lead/associé revoit (in_review) → approuve ou rejette (renvoi en correction).
- Puis envoi au client pour validation.

Niveaux de conformité : **Conforme / Largement / Partiellement / Non conforme / N-A**, agrégés en score pondéré par domaine puis global (seuils ≥80 / ≥60 / <40).

### 4.2 Constats (findings)

Modèle **N constats par évaluation** (`assessment_findings`), chacun avec : classification (`major_nc`, `minor_nc`, `observation`, `strength`), risque, recommandation, priorité, échéance proposée. Cohérence constats ↔ niveau de conformité vérifiée à la soumission.

### 4.3 Gestion des preuves

Cycle d'une demande de preuve : `pending → uploaded → accepted | declined_by_client | escalated_to_finding`. L'absence de preuve peut être **escaladée en constat**. Le client dépose des documents ou décline (avec motif).

### 4.4 Rapports & exports

| Livrable | Format | Contenu |
|---|---|---|
| Rapport d'audit | PDF | Synthèse conformité, score par domaine, constats, recommandations, annexes |
| Plan d'action | Excel | Actions correctives (statut open → client_responded → verified → closed) |
| Note de cadrage | PDF | Périmètre, objectifs, risques |
| Compte-rendu d'entretiens | PDF | Support planification |
| (selon plan) | PPTX | Restitution exécutive |

---

## 5. Portail client (Comply) & assujetti (Regul)

- **Accès** : le staff invite un contact (email) → le contact **définit son mot de passe** (`/set-password`, lien de récupération) → accès au portail. *(Pas de magic-link anonyme.)*
- **Permissions portail** (`client_mission_access.permission`) : `contributor` (répondre / déposer), `viewer` (consulter), `approver` (valider).
- **Cloisonnement** : le contact ne voit que les missions explicitement accordées (`client_mission_access`), via la RLS `cp_*`.
- **Écrans** : tableau de bord, missions (timeline, questionnaire, documents, observations, plan d'action, rapports), notifications, aide.
- **Regul** : en plus, l'assujetti **déclare et suit ses incidents** (M5-2) depuis son portail.

---

## 6. Fonctions augmentées par IA (Comply, selon feature flags)

| Fonction | Rôle utilisateur | Sortie |
|---|---|---|
| **Smart Interview** (portail) | Pré-remplit le questionnaire client à partir des documents déposés (extraction puis synthèse), avec niveau de confiance et type de preuve | Réponses proposées, validées par le client |
| **Smart Plan** | Propose le programme de travail : niveau de risque, techniques d'audit, affectation, budget heures, justification | Aperçu accepté/ajusté avant persistance |
| **Smart Analyse** | Analyse un contrôle (docs + réponses) et propose des constats | Jusqu'à N `assessment_findings` |
| **Smart Risks** | Détecte les risques initiaux au cadrage | `mission_risks` |

Chaque appel IA est journalisé (modèle, tokens, coût estimé) ; aucun prompt/réponse n'est stocké. Kill-switch global par feature flag + résolution par plan.

---

## 7. Module Groupe & Supervision (Comply)

Pour les organisations `group` supervisant plusieurs entités :
- **Campagnes d'audit** : lancer un audit coordonné multi-entités sur une période (référentiel + période + entités → N missions).
- **Heatmap** : matrice entités × domaines colorée par score/risque.
- **Évolution / classement / risques / KPIs** : suivi de la posture du parc dans le temps.
- **Score** : `domaine = contrôles approuvés / total × 100` ; global = moyenne pondérée ; seuils ≥80 / ≥60 / <40.

---

## 8. Produit Regul — modules M1–M8 (détail)

| Module | Fonction |
|---|---|
| **M1 Registre assujettis** | Enregistrement typé des entités régulées ; profil réglementaire : criticité (échelle **neutre & configurable** : élevée / standard / indéterminée), régime d'obligation, tier, statut, dates d'entrée/sortie. Hiérarchie via `parent_org_id`. |
| **M3 Missions de contrôle** | Le régulateur planifie un contrôle sur un assujetti (réutilise le moteur d'audit) ; `cabinet_id = régulateur`, `client_id = assujetti`. |
| **M4 Constats & mesures** | Actes gradués : recommandation → mise en demeure → injonction → sanction ; escalade via `parent_measure_id` ; chaque acte **ancré au journal probant**. |
| **M5 Incidents** | Déclaration (régulateur ou assujetti), qualification, notification, résolution, clôture. Échéances (notification initiale / rapport final) **figées à la déclaration** selon des règles paramétrables par gravité. |
| **M6 Référentiels** | Consultation des cadres d'audit (PSSI-ES : 11 domaines / 213 contrôles). |
| **M7 Portail assujetti** | Espace cloisonné ; provisioning par « Inviter un contact » depuis la fiche assujetti. |
| **M8 Pilotage & posture** | Tableau de bord régulateur : posture du parc, cartographie criticité × conformité, priorisation actionnable, répartition des mesures & échéances. |
| **S1 Traçabilité probante** | Journal `probative_log` append-only chaîné par hash ancrant les actes (transverse). |

---

## 9. Notifications

Notifications personnelles par utilisateur (`notifications`), créées côté serveur uniquement. Types : soumission, approbation, rejet, réponse client, clôture de mission, invitation. UI : page dédiée, compteur de non-lus, marquage lu/tout lu. RLS : chacun ne voit que les siennes.

---

## 10. Marque blanche & branding (Comply)

Personnalisation par cabinet : logo (clair/sombre), couleurs, domaine custom (CNAME), nom d'affichage, email support, footer. Résolution par hostname avant login (`resolve-tenant-by-hostname`) ; injection de variables CSS. Portail client co-brandé. Activé par feature flag `white_label_branding` (repli branding par défaut sinon).

---

## 11. Support & centre d'aide

Tickets de trois natures : **bug**, **demande**, **suggestion**. Statuts : `open → in_progress → answered → escalated → resolved → closed`. Contexte capturé (mission, rôle, navigateur…). Triage IA optionnel pour les bugs (catégorisation + gravité + action proposée) selon feature flag. Portail client : formulaires abrégés, l'utilisateur ne voit que ses propres demandes.

---

## 12. Feature flags & plans

Résolution : kill-switch global → override par organisation → inclusion dans le plan → sinon OFF. Cache en session. Permet d'activer/désactiver par cabinet les fonctions IA, la supervision groupe, la marque blanche, les relances de preuves, le triage support, etc.

---

## 13. Moteur de questionnaire

`questionnaire_templates` → `questions` (types : texte, choix simple/multiple, booléen, upload, date, nombre, échelle %, organigramme) → `questionnaire_instances` (par mission) → `questionnaire_responses`. Logique de saut (skip logic), multi-répondants, et **liaison question ↔ contrôle** (`question_controls`) : les réponses de cadrage alimentent l'évaluation des contrôles.

---

## 14. Règles métier notables (récapitulatif)

- Cohérence **constats ↔ conformité** au moment de la soumission.
- **Escalade de mesure** obligatoirement vers un niveau supérieur.
- **Échéances d'incident** figées à la déclaration (règles paramétrables).
- **Criticité neutre & configurable** (libellés centralisés dans `constants.ts`).
- Auditeur terrain **restreint à ses contrôles** ; phases amont réservées lead/associé.
- Écritures sensibles via Edge Functions `service_role` avec vérification d'appartenance.
