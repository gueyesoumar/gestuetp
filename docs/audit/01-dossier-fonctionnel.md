# Dossier fonctionnel — Gëstu ETP

> Document préparé pour l'audit externe (volet fonctionnel). Version du 2026-07-09.
> Périmètre : plateforme **Gëstu ETP** dans son ensemble — socle partagé + produits **Comply** et **Regul**.

## 1. Vue d'ensemble

**Gëstu ETP** est une plateforme SaaS multi-tenant de conformité et d'audit des systèmes d'information. Elle se décline en **deux produits** issus d'un **codebase unique** (sélection au build via `VITE_PRODUCT`) :

| Produit | Public | Modèle | Instance Supabase |
|---|---|---|---|
| **Gëstu Comply** (défaut) | Cabinets d'audit & entités auditant leur conformité | 1 cabinet ↔ N clients (introspectif) | `jibblzpownddlodzmewj` |
| **Gëstu Regul** (`VITE_PRODUCT=regul`) | Autorité de régulation cyber (ex. DCSSI Sénégal) | 1 régulateur supervise N assujettis (pouvoir contraignant) | `snayznxraupndrdmhbak` (dédiée, souveraine) |

Le moteur (auth, RLS, portail, RBAC, moteur d'audit) est **partagé**. Seuls le branding, le vocabulaire (`productVocab` dans `src/lib/product.ts`) et l'exposition des modules diffèrent. Aiguillage racine dans `src/App.tsx` : `{isRegul ? <RegulApp/> : <ComplyRoutes/>}`.

## 2. Rôles applicatifs

| Rôle | Champ | Accès |
|---|---|---|
| **Super-admin plateforme** | `users.is_platform_owner = true` | Console `/admin` (gestion cabinets, users, référentiels, plans, monitoring) |
| **Membre cabinet / auditeur** | `users.role = 'auditor'` | Back-office (missions, cadrage, travaux, revues, rapports) |
| **Client / assujetti** | `users.role = 'client'` | Portail cloisonné `/client/*` uniquement |

Gardes de route : `ProtectedRoute` (staff, redirige les clients vers `/client`), `ClientProtectedRoute` (clients, redirige le staff vers `/`), `AdminProtectedRoute` (super-admin).

### RBAC cabinet (permissions granulaires)

Les droits fins sont portés par `platform_roles` (rôles) ↔ `user_platform_roles` (affectation), évalués côté backend via la fonction `user_has_cabinet_permission`. Permissions observées (`can_*`) :

`can_create_mission`, `can_designate_lead`, `can_be_lead`, `can_assign_team`, `can_manage_members`, `can_delete_mission`, `can_edit_organization`, `can_manage_subsidiaries`, `can_view_entity_detail`, `can_view_supervision`, `can_create_campaign`.

## 3. Modules Comply

**Back-office cabinet** (routes dans `src/App.tsx`) :
- **Missions** — création en assistant 6 étapes ; détail par phase.
- **Clients** — CRUD fiches client (`cabinet_clients`), contacts portail, invitations.
- **Cadrage / Scoping** — périmètre, questionnaire, risques, exclusions, parties prenantes.
- **Planification** — sélection domaines/contrôles, matrice d'entretiens, programme de travail.
- **Travaux (fieldwork)** — évaluation des contrôles (guidée ou libre).
- **Revue interne** — validation par le lead auditeur.
- **Revue client** — validation / contestation par le client.
- **Clôture** — génération des rapports (PDF/PPTX) et plan d'action (Excel).
- **Référentiels** — frameworks / domaines / contrôles ; comparaison.
- **Supervision (groupe)** — entités, campagnes, heatmap (si organisation de type `group`).
- **Membres / Organisation / Notifications / Support**.

**Portail client** (`/client/*`) : tableau de bord, mes missions, documents, notifications, aide.

**Super-admin** (`/admin/*`) : cabinets, utilisateurs, plans, monitoring, référentiels plateforme, journal d'audit admin.

## 4. Modules Regul (mapping M1–M8)

Navigation régulateur (`src/regul/RegulApp.tsx`, `RegulSidebar.tsx`) :

| Module | Route | Contenu |
|---|---|---|
| **M8 Pilotage** (= Tableau de bord) | `/` | Posture agrégée du parc, cartographie criticité × conformité, priorisation, mesures |
| **M1 Registre assujettis** | `/assujettis`, `/assujettis/:id` | Registre typé, profil réglementaire (criticité, régime, tier, statut) |
| **M3 Missions de contrôle** | `/controles`, `/controles/:id` | Planification et suivi des contrôles (réutilise le moteur d'audit) |
| **M4 Constats & mesures** | `/constats` | Actes gradués : recommandation → mise en demeure → injonction → sanction |
| **M5 Incidents** | `/incidents` | Déclaration, triage, notification, échéances (règles configurables) |
| **M6 Référentiels** | `/referentiels` | Consultation des cadres (PSSI-ES : 11 domaines / 213 contrôles) |
| **M7 Portail assujetti** | `/client/*` | Espace cloisonné : missions, incidents auto-déclarés, documents |
| **S1 Traçabilité probante** | (transverse) | Journal `probative_log` chaîné par hash ancrant chaque acte |

## 5. Cycle de vie d'une mission

Statuts (`missions.status`) : `initialization → scoping → planning → fieldwork → internal_review → client_review → closure`.

Évaluation d'un contrôle (`control_assessments.status`) : `draft → submitted → in_review → approved | rejected`.
Niveaux de conformité : Non conforme / Partiellement / Largement / Conforme / N-A.

## 6. Parcours clés

**Client Comply / Assujetti Regul (portail)** : invitation par email → définition du mot de passe (`/set-password`) → portail cloisonné → consultation missions / documents / (Regul) déclaration d'incidents. Accès strictement limité aux missions explicitement accordées (`client_mission_access`).

**Régulateur (Regul)** : enregistrer un assujetti (M1) → planifier un contrôle sur un référentiel réel (M3/M6) → produire des constats → prononcer une mesure graduée (M4, ancrée au journal probant) → suivre les incidents déclarés (M5) → piloter la posture du parc (M8). Un contact assujetti est invité depuis la fiche assujetti (edge function `invite-assujetti`).

## 7. Règles métier notables

- **Cohérence constats ↔ conformité** vérifiée à la soumission d'une évaluation.
- **Mesures graduées** : une escalade doit cibler un niveau supérieur (`parent_measure_id`).
- **Échéances d'incident** figées à la déclaration selon `incident_notification_rules` (paramétrable par gravité).
- **Criticité neutre & configurable** : échelle `eleve / standard / indetermine` (libellés centralisés dans `src/lib/constants.ts`).
