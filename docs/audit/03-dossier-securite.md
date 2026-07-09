# Dossier de sécurité — Gëstu ETP

> Document préparé pour l'audit externe (volet sécurité). Version du 2026-07-09.
> Rédigé à partir d'un inventaire du code réel (migrations RLS, Edge Functions, configuration). Les **faiblesses connues** y sont déclarées volontairement (§9) — ce dossier n'a pas vocation à masquer les écarts mais à orienter l'auditeur.

## 1. Modèle de menace (synthèse)

Actifs : données de conformité et d'audit (potentiellement sensibles / souveraines côté Regul), preuves déposées par les clients, actes réglementaires à valeur probante, identités.

Menaces principales adressées :
1. **Fuite inter-tenant** (un cabinet/assujetti voit les données d'un autre) → RLS + cloisonnement (§4).
2. **Élévation de privilège** (client → staff, membre → admin) → gardes de rôle + RBAC + Edge Functions service_role (§2, §3).
3. **Falsification d'actes réglementaires** → journal probant append-only chaîné (§6).
4. **XSS / injection** → échappement React + en-têtes ; écarts connus en §9.
5. **Exposition de secrets** → séparation stricte clé anon (front) / service_role (backend) (§7).

## 2. Authentification

- **Supabase Auth (JWT)**. Le frontend n'embarque que la **clé anon** ; aucune clé `service_role` côté client (`src/lib/supabase.ts`).
- Chaque Edge Function sensible ré-authentifie l'appelant côté serveur via `authenticateCaller` (`_shared/auth.ts`) : vérification du JWT (`admin.auth.getUser`), chargement du profil `users`, **refus si `is_active = false`**.
- Gardes de route côté client (`ProtectedRoute`, `ClientProtectedRoute`, `AdminProtectedRoute`) — défense en profondeur UX, **la sécurité réelle étant la RLS + les Edge Functions** (le client n'est jamais la source de vérité).

## 3. Autorisation & RBAC

- **Super-admin** : toutes les Edge Functions `/admin` appellent `requirePlatformOwner` (`_shared/auth-platform-owner.ts`) qui exige `is_platform_owner = true` **et journalise l'action** dans `admin_audit_log` (`logAdminAction`, raison obligatoire).
- **Permissions cabinet** : `hasCabinetPerm(admin, userId, perm)` → RPC `user_has_cabinet_permission` (SECURITY DEFINER), **fail-closed** (refus si erreur). Utilisée pour `can_create_mission`, `can_manage_members`, `can_manage_subsidiaries`, etc.
- **Écritures sensibles réservées au `service_role`** (Edge Functions) : création de comptes, mutations d'organisations/missions, mesures, incidents. Le RLS interdit ces écritures aux rôles `authenticated` → tout passe par le backend qui re-vérifie l'appartenance avant chaque opération.

## 4. Cloisonnement multi-tenant (RLS)

### 4.1 Pattern anti-récursion (fondamental)

Une policy RLS ne doit **jamais** interroger sa propre table (récursion). Le projet impose l'usage de **fonctions `SECURITY DEFINER`** qui résolvent le périmètre du demandeur hors du contexte RLS :

| Helper | Retour |
|---|---|
| `get_my_user_id()` | id `users` courant |
| `get_my_organization_id()` | org du staff courant (**NULL si `role='client'`** — cf. 4.3) |
| `get_my_mission_ids()` | missions d'équipe du staff (vide pour client) |
| `get_my_client_mission_ids()` | missions accordées au contact portail (via `client_mission_access`) |
| `get_subsidiary_ids(parent_id)` | sous-arbre d'organisations (filiales / assujettis) |
| `get_my_entity_org_ids()` | org(s) assujettie(s) du contact Regul (via `client_portal_contacts.entity_org_id`) |
| `get_my_client_org_ids()`, `get_my_client_visible_org_ids()`, `get_my_parent_org_id()` | scopes annexes (clients audités, orgs visibles en portail, parent groupe) |

Toutes ces fonctions sont `SECURITY DEFINER` avec `SET search_path = public` (durci en migration 00127).

### 4.2 Cloisonnement staff (cabinet / groupe)

Policies scopées par `cabinet_id = get_my_organization_id()` (cabinet) ou `... IN (get_subsidiary_ids(get_my_organization_id()))` (groupe / régulateur).

### 4.3 Cloisonnement portail client (durcissement 00133–00135)

**Constat initial** : un `role='client'` a `organization_id` = l'org du cabinet ; sans précaution, les policies staff basées sur `get_my_organization_id()` lui auraient donné accès aux données du cabinet.

Remédiation en trois migrations :
- **00133** — ajout de `NOT is_client_role()` sur les policies staff des tables que le client ne doit pas voir.
- **00134** — **neutralisation** de `get_my_organization_id()` et `get_my_mission_ids()` pour `role='client'` (retour NULL/vide) ; le client n'accède qu'aux policies dédiées `cp_*` via `is_client_role() AND mission_id IN (get_my_client_mission_ids())`.
- **00135** — remplacement du SELECT ouvert sur `organizations` par une policy scopée (fin de l'énumération cross-tenant).

Le chemin d'accès client est unique : `user → client_portal_contacts → client_mission_access → mission`. Vérifié e2e (aucune fuite inter-assujettis, cf. dossier de recette Regul).

### 4.4 Cloisonnement régulateur (Regul)

`entity_regulatory_profile` (00137), `regulatory_measures` (00139), `incidents` (00144) : lecture staff scopée `entity_id IN get_subsidiary_ids(get_my_organization_id())` + `NOT is_client_role()`. Lecture assujetti scopée via `get_my_entity_org_ids()` (00145). Écritures en `service_role` uniquement.

### 4.5 Isolation des instances

Comply et Regul sont sur **deux projets Supabase distincts** — isolation physique des données commerciales et gouvernementales (souveraineté).

## 5. Edge Functions (surface d'écriture)

59 fonctions Deno, classées par niveau de confiance :
- **Super-admin** (`requirePlatformOwner` + `admin_audit_log`) : gestion cabinets, users, référentiels, plans, branding, domaines.
- **Membre cabinet** (`authenticateCaller` + permission + garde cabinet) : missions, équipes, invitations, questionnaires.
- **Acteurs mission** (rôle lead/associé/membre) : soumission/revue d'évaluations, clôture, preuves.
- **Portail** : `invite-client`, `invite-assujetti` (garde sous-arbre `get_subsidiary_ids`).
- **Régulateur** : `issue-measure`, `declare-incident`, `probative-log` (chaque acte **ancré dans `probative_log`**).
- **Agents IA** (Claude) : `smart-*` (feature-flag + `logAiCall` : modèle, tokens, coût).
- **Webhooks** : `feasibility-callback` (secret partagé, comparaison *timing-safe*, anti-rejeu).

Constantes : re-vérification systématique de l'appartenance (cabinet / sous-arbre / own-org) avant écriture ; messages d'erreur **génériques** au client, détail en logs serveur.

## 6. Traçabilité probante (S1)

`probative_log` (00138) : table **append-only** chaînée par **hash SHA-256** (`hash` = sha256 de la forme canonique incluant `prev_hash`). Fonctions `probative_canonical` / `probative_hash` **IMMUTABLE**. Trigger BEFORE INSERT calcule `seq`/`prev_hash`/`hash` ; trigger BEFORE UPDATE/DELETE **lève une exception** (immutabilité stricte). Fonction `verify_probative_chain()` rejoue la chaîne et retourne le premier point de rupture — utilisable par l'auditeur pour détecter toute falsification.

## 7. Gestion des secrets

- **Front** : seules des variables `VITE_*` publiques (URL + clé anon Supabase). La clé anon est conçue pour être publique (RLS applique la sécurité).
- **Backend (Edge Functions)** : `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, secret webhook — jamais exposés au client.
- **Aucun secret en dur** dans `src/` (vérifié). `.env.local` non versionné.
- Recommandation opérationnelle : rotation périodique de la clé `service_role` ; procédure de rotation à documenter.

## 8. Sécurité HTTP (frontend)

En-têtes définis dans `vercel.json` :
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Protection XSS : React échappe par défaut ; **aucun `dangerouslySetInnerHTML` dans `src/`** (le seul, en code mort, a été supprimé). Upload de logo (`upload-cabinet-logo`) : whitelist MIME (PNG/SVG), limite de taille, **sanitisation SVG** (suppression `script`/`foreignObject`/`iframe`/`object`/`embed`/`on*`/`javascript:`).

## 9. Écarts connus & risques résiduels (déclaration volontaire)

| # | Écart | Risque | Sévérité | Recommandation |
|---|---|---|---|---|
| R1 | **Pas de Content-Security-Policy** (ni `vercel.json`, ni meta) | XSS / injection de ressources | Moyen | Ajouter une CSP stricte (`default-src 'self'`, autoriser l'hôte Supabase) |
| ~~R2~~ | ~~`dangerouslySetInnerHTML`~~ **RÉSOLU** : le seul composant concerné (`dashboard/ActionsList.tsx`) était du **code mort** (jamais monté) ; il a été supprimé. **Plus aucun `dangerouslySetInnerHTML` dans `src/`.** | — | Résolu | — |
| R3 | **Génération de documents côté client** (`jspdf`, `html2canvas`, `exceljs`) | XSS/DoS si contenu brut | Faible-Moyen | Vérifier l'échappement des données injectées dans les rendus PDF/canvas ; suivre les CVE |
| R4 | **Absence de `.env.example`** | Onboarding / erreur de config | Faible | Créer un fichier d'exemple à placeholders |
| R5 | **Lint non bloquant** (~243 erreurs préexistantes, surtout Edge Functions Deno) | Dette qualité | Faible | Traiter progressivement ; la garde reste `typecheck` + `build` |
| R6 | **Migrations appliquées manuellement** (psql) | Erreur humaine / dérive d'environnement | Faible-Moyen | Journaliser les applications ; envisager une automatisation contrôlée |

## 10. Points forts à souligner

- TypeScript **strict** + gates CI (`typecheck`, `build`) bloquants.
- RLS sur ~67 tables, pattern anti-récursion systématique via `SECURITY DEFINER`.
- Cloisonnement portail **durci et vérifié** (00133–00135) ; isolation des instances Comply/Regul.
- Écritures sensibles exclusivement via `service_role` avec double garde (permission + appartenance).
- Journal probant append-only vérifiable (valeur probante).
- Séparation stricte des secrets front/back ; en-têtes de sécurité configurés.

## 11. Éléments à fournir à l'auditeur pour vérification

- Accès en lecture aux migrations `supabase/migrations/` et aux Edge Functions `supabase/functions/`.
- Comptes de test (staff, client/assujetti, super-admin) — cf. `05-guide-acces-tests.md`.
- Résultat de `verify_probative_chain()` sur l'instance Regul.
- Export des policies RLS effectives (via le dashboard Supabase ou `pg_policies`).
