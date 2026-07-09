# Matrice de contrôles de sécurité — Gëstu ETP

> Grille d'auto-évaluation alignée sur les catégories **OWASP ASVS**. À usage de l'auditeur : colonne « Statut déclaré » = position de l'éditeur ; colonne « Vérifié auditeur » à compléter.
> Légende statut : ✅ en place · ⚠️ partiel / à améliorer · ❌ absent · N/A.

## V1 — Architecture & conception

| Contrôle | Statut déclaré | Preuve / emplacement | Vérifié auditeur |
|---|---|---|---|
| Défense en profondeur (client + RLS + Edge Functions) | ✅ | `ProtectedRoute`, RLS, `_shared/auth.ts` | ☐ |
| Séparation des responsabilités (front / BaaS / functions) | ✅ | `src/`, `supabase/` | ☐ |
| Isolation multi-tenant documentée | ✅ | §4 dossier sécurité | ☐ |
| Isolation des environnements sensibles (Regul dédié) | ✅ | 2 projets Supabase | ☐ |

## V2 — Authentification

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Auth centralisée (Supabase JWT) | ✅ | `src/lib/supabase.ts` | ☐ |
| Ré-authentification serveur des appels sensibles | ✅ | `authenticateCaller` | ☐ |
| Comptes désactivés refusés (`is_active`) | ✅ | `_shared/auth.ts` | ☐ |
| Réinitialisation de mot de passe par lien (pas de plaintext) | ✅ | `admin-user`, `reset-user-password` | ☐ |
| MFA | ⚠️/N/A | Non implémenté (dépend de la config Supabase Auth) | ☐ |

## V3 — Gestion de session

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Sessions gérées par supabase-js (JWT) | ✅ | client Supabase | ☐ |
| Pas de token sensible en localStorage applicatif | ✅ | revue `localStorage` (usages non sensibles) | ☐ |
| Cookies custom / CSRF custom | N/A | pas de cookie custom | ☐ |

## V4 — Contrôle d'accès

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| RLS activée sur les tables sensibles (~67) | ✅ | migrations `enable row level security` | ☐ |
| Pattern anti-récursion (SECURITY DEFINER) | ✅ | helpers `get_my_*`, mig 00022/00023/00127 | ☐ |
| Cloisonnement portail client durci | ✅ | mig 00133/00134/00135 | ☐ |
| Cloisonnement régulateur (sous-arbre) | ✅ | mig 00137/00139/00144/00145 | ☐ |
| RBAC serveur (permissions cabinet) fail-closed | ✅ | `hasCabinetPerm`, RPC `user_has_cabinet_permission` | ☐ |
| Écritures sensibles réservées au service_role | ✅ | Edge Functions | ☐ |
| Gate super-admin + journal | ✅ | `requirePlatformOwner`, `admin_audit_log` | ☐ |

## V5 — Validation, assainissement, encodage

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Échappement XSS par défaut (React) | ✅ | JSX | ☐ |
| `dangerouslySetInnerHTML` maîtrisé | ✅ | aucune occurrence dans `src/` (le seul, code mort, supprimé) | ☐ |
| Sanitisation des uploads (SVG) | ✅ | `upload-cabinet-logo` | ☐ |
| Content-Security-Policy | ❌ | absente (R1) | ☐ |
| Validation des entrées (hostname/slug/MIME) | ✅ | regex dans Edge Functions | ☐ |

## V6 — Cryptographie & données au repos

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Chiffrement au repos / en transit | ✅ | géré par Supabase (Postgres + TLS) | ☐ |
| Intégrité des actes (hash-chaining) | ✅ | `probative_log`, `verify_probative_chain()` | ☐ |
| Secrets hors du code | ✅ | pas de secret en dur dans `src/` | ☐ |

## V7 — Gestion des erreurs & journalisation

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Messages d'erreur génériques côté client | ✅ | Edge Functions | ☐ |
| Journal d'actions super-admin | ✅ | `admin_audit_log` | ☐ |
| Journal probant (régulateur) | ✅ | `probative_log` | ☐ |
| Journalisation des appels IA (coût/tokens) | ✅ | `logAiCall` | ☐ |

## V9 — Communications

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| En-têtes de sécurité HTTP | ✅ | `vercel.json` (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) | ☐ |
| HTTPS partout | ✅ | Vercel + Supabase | ☐ |
| CSP | ❌ | R1 | ☐ |

## V10 — Code malveillant / dépendances

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Lockfile présent | ✅ | `package-lock.json` | ☐ |
| Dépendances maintenues | ⚠️ | `jspdf`/`html2canvas` à surveiller (R3) | ☐ |
| TypeScript strict | ✅ | `tsconfig.app.json` | ☐ |
| Gates CI (typecheck + build) | ✅ | `.github/workflows/ci.yml` | ☐ |
| Scan de vulnérabilités dépendances (SCA) | ⚠️ | à mettre en place (`npm audit` / Dependabot) | ☐ |

## V13 — API & Edge Functions

| Contrôle | Statut | Preuve | Vérifié |
|---|---|---|---|
| Auth sur toutes les fonctions sensibles | ✅ | `authenticateCaller` / `requirePlatformOwner` | ☐ |
| Vérification d'appartenance avant écriture | ✅ | gardes cabinet/sous-arbre/own-org | ☐ |
| Webhooks authentifiés (secret + timing-safe) | ✅ | `feasibility-callback` | ☐ |
| Rate limiting anti-énumération | ⚠️ | partiel (infra) — à confirmer | ☐ |

## Synthèse des écarts (à traiter)

| Réf | Écart | Sévérité |
|---|---|---|
| R1 | CSP absente | Moyen |
| ~~R2~~ | `dangerouslySetInnerHTML` — **résolu** (code mort supprimé) | — |
| R3 | Dépendances de génération de documents à surveiller | Faible-Moyen |
| R6 | Migrations manuelles (dérive possible) | Faible-Moyen |
| — | SCA/Dependabot, MFA, rate-limiting explicite | Faible |
