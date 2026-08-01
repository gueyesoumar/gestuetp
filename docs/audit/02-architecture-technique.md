# Dossier d'architecture technique — Gëstu ETP

> **⚠ Évolution post-audit — voir [RFC 0001](../rfc/0001-modele-relationnel-organisations.md) (accepté le 2026-07-29).** Ce document reflète l'état à la date d'audit. Depuis, l'architecture a été **unifiée** : une seule plateforme ETP, **branche et schéma de base unifiés**, et **Regul n'est plus un « produit séparé » mais une _édition_** (preset de capacités + vocabulaire + branding, résolu au runtime — le fork `VITE_PRODUCT` et l'« instance dédiée » sont en cours de suppression). La **souveraineté** relève de la **topologie d'hébergement**, orthogonale à l'édition. Les passages ci-dessous évoquant « deux produits / deux instances dédiées / `VITE_PRODUCT` » sont donc **datés** et remplacés par le RFC.

> Document préparé pour l'audit externe. Version du 2026-07-09.

## 1. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| UI | React | 19.2.x |
| Build | Vite | 8.x |
| Langage | TypeScript **strict** | ~6.0 |
| Styles | Tailwind CSS | 4.2.x |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Storage, RLS, Edge Functions Deno) | client `@supabase/supabase-js` 2.103 |
| Routing | React Router DOM | 7.14 |
| Emails | Resend (via Edge Functions) | — |
| IA | API Anthropic (Claude) via Edge Functions | — |

TypeScript est en mode **`strict: true`** (+ `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Aucune tolérance au `any` implicite.

## 2. Organisation du code

```
src/
  App.tsx            aiguillage produit (Comply | Regul)
  lib/               clients & utilitaires techniques (supabase.ts, product.ts, constants.ts)
  components/        UI réutilisable (dont ProtectedRoute, ClientProtectedRoute)
  hooks/             hooks partagés (useAuth…)
  pages/             pages (assemblage)
  features/<module>/ logique métier par module (missions, client-portal, group-module, admin…)
  regul/             application Regul dédiée (RegulApp, incidents/, pilotage/…)
  types/             database.types.ts (schéma typé Supabase)
supabase/
  migrations/        NNNNN_nom_up.sql / _down.sql
  functions/         Edge Functions (Deno) + _shared/
```

Conventions : composants ≤ 150 lignes, une responsabilité par fichier, options de formulaire centralisées dans `constants.ts`.

## 3. Modèle de données

- **~146 migrations** (`*_up.sql` + `*_down.sql`, convention `NNNNN_nom_up/_down`), schéma typé dans `src/types/database.types.ts`.
- **~67 tables** avec RLS activé. Grandes familles :
  - **Organisations & accès** : `organizations`, `users`, `platform_roles`, `user_platform_roles`, `tenant_configs`, `organization_branding`, `cabinet_domains`.
  - **Missions & audit** : `missions`, `mission_members`, `mission_control_assignments`, `control_assessments`, `assessment_findings`, `assessment_validations`, `mission_risks`, `mission_exclusions`, `control_planning`.
  - **Référentiels** : `frameworks`, `domains`, `controls`, `questions`, `questionnaire_*`, `evidence_catalog`.
  - **Portail client** : `cabinet_clients`, `client_portal_contacts`, `client_mission_access`, `client_action_items`.
  - **Régulateur (Regul)** : `entity_regulatory_profile`, `regulatory_measures`, `incidents`, `incident_notification_rules`, `probative_log`.
  - **Transverse** : `documents`, `reports`, `notifications`, `support_requests`, `admin_audit_log`, `agent_runs`.

### Modèle multi-produit (pivot Comply ↔ Regul)

Regul ne crée **pas** de nouvelle table de mission : l'organe régulateur est une `organizations` de type `group` ; un assujetti est une `organizations` avec `parent_org_id = régulateur` + un `entity_regulatory_profile` ; une mission de contrôle = `missions` avec `cabinet_id = régulateur` et `client_id = assujetti`.

## 4. Authentification & sessions

- Auth **Supabase** (JWT). Le client frontend n'utilise que la **clé anon** (`src/lib/supabase.ts`), jamais la clé `service_role`.
- Les sessions sont gérées par supabase-js (pas de cookie custom, pas de token en `localStorage` applicatif sensible).
- Les opérations sensibles passent par des **Edge Functions** en `service_role` (voir dossier sécurité).

## 5. Environnements & déploiement

- **Hébergement front** : Vercel. Build = `npm run typecheck && npm run build`. Rewrites SPA. En-têtes de sécurité définis dans `vercel.json` (voir dossier sécurité).
- **Branches** : `staging` (préprod) → `main` (prod). Domaine de production : `app.gestugroup.com`.
- **Deux instances Supabase distinctes** (séparation commercial / gouvernemental) : Comply `jibblzpownddlodzmewj`, Regul `snayznxraupndrdmhbak` (eu-west-1, souveraineté).
- **Variables d'environnement** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PRODUCT`, `VITE_REGUL_URL`. Les `VITE_*` sont **publiques** (embarquées au build). Les secrets (service_role, clés API, secret webhook) vivent uniquement côté Edge Functions.

## 6. Intégration & CI/CD

- **`.github/workflows/ci.yml`** sur `main` / `staging` :
  - Gate bloquant 1 : `npm run typecheck` (`tsc -b`, 0 erreur exigée).
  - Gate bloquant 2 : `npm run build` (build de production).
  - Lint : informatif, non bloquant.
- **Migrations** appliquées manuellement sur les instances cloud via `psql -f` (convention up/down maison incompatible avec `supabase db push`). Chaque Edge Function est déployée par instance (`--project-ref`).

## 7. Edge Functions (Deno)

**59 fonctions** dans `supabase/functions/`, regroupées par niveau de confiance (détaillé dans le dossier sécurité) : super-admin (`requirePlatformOwner`), membre cabinet (`authenticateCaller` + permission), acteurs mission, portail client/assujetti, spécifique régulateur (ancrage probant), agents IA (Claude), webhooks (secret partagé). Modules partagés dans `_shared/` (`auth.ts`, `auth-platform-owner.ts`, `cabinet-permissions.ts`, `cors.ts`, `resend.ts`, `email-branding.ts`).

## 8. Points d'attention architecturaux (transparence)

- **Absence de `.env.example`** — à créer pour l'onboarding.
- **Génération de documents côté client** (`jspdf`, `html2canvas`, `exceljs`) — à vérifier qu'aucun contenu non échappé n'y transite (voir dossier sécurité).
- **Lint non bloquant** (~243 erreurs préexistantes, surtout côté Edge Functions Deno) — la garde de qualité repose sur `typecheck` + `build`.
