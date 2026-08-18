# Documentation — Gëstu ETP

Carte de la documentation du projet. Le code vit dans [`../src/`](../src/), les migrations et Edge Functions dans [`../supabase/`](../supabase/).

> Docs conventionnelles à la **racine** du repo (hors `docs/`) : [`../README.md`](../README.md), [`../CLAUDE.md`](../CLAUDE.md) (règles projet lues par l'outillage), [`../BRAND.md`](../BRAND.md) (charte graphique), [`../CONTEXT.md`](../CONTEXT.md) (contexte produit).

## Sous-dossiers

| Dossier | Contenu |
|---|---|
| [`rfc/`](rfc/) | **Décisions d'architecture** (RFC). Documents de référence figés, une décision majeure par fichier. |
| [`audit/`](audit/) | **Dossier d'audit** complet (fonctionnel, sécurité, architecture, matrice de contrôles, onboarding, revues OWASP…). Voir son [README](audit/README.md). |
| [`ops/`](ops/) | **Exploitation** : mise en place CI/CD ([`cicd-setup.md`](ops/cicd-setup.md)), scellements probatoires ([`probative-seals/`](ops/probative-seals/)). |
| [`runbooks/`](runbooks/) | **Procédures opérationnelles** (ex. [activation MFA](runbooks/mfa-activation.md)). |
| [`mockups/`](mockups/) | **Maquettes design** (HTML, ~69) — historique des directions visuelles. |
| [`demo/`](demo/) | Supports de **démonstration** (ex. démo DCSSI). |
| [`tests/`](tests/) | **Cahier de tests** (`.md` + `.xlsx`). |
| [`archive/`](archive/) | Documents **historiques** : handoff de portage, prototypes, résumés obsolètes. |

## RFC (décisions d'architecture)

| # | Sujet |
|---|---|
| [0001](rfc/0001-modele-relationnel-organisations.md) | Modèle relationnel des organisations (graphe entité/arête/capacité) |
| [0002](rfc/0002-editions-capabilities-v2.md) | Éditions & capacités (modules à la carte) |
| [0003](rfc/0003-moteurs-de-mission.md) | Moteurs de mission (audit / contrôle) |
| [0004](rfc/0004-gestu-risk.md) | Gëstu Risk (registre EBIOS RM, score) |
| [0005](rfc/0005-gestu-policy.md) | Gëstu Policy (gouvernance documentaire) |

## Notes transverses (racine de `docs/`)

- [`SECURITY-REVIEW-2026-06.md`](SECURITY-REVIEW-2026-06.md) — revue de sécurité
- [`SUPPORT-AGENTS-PLAN.md`](SUPPORT-AGENTS-PLAN.md) — plan des agents de support
- [`ops-super-admin.md`](ops-super-admin.md) · [`ops-evidence-reminders.md`](ops-evidence-reminders.md) — notes d'exploitation
