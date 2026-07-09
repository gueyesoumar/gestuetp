# Dossier d'audit — Gëstu ETP

Ensemble documentaire préparé pour un **audit externe fonctionnel et sécurité** de la plateforme Gëstu ETP (socle partagé + produits Comply et Regul). Version du 2026-07-09.

## Contenu

| Fichier | Objet |
|---|---|
| [00-contexte-metier-et-vision.md](00-contexte-metier-et-vision.md) | **Le « pourquoi »** — problème métier, acteurs, logiques du domaine (audit & régulation), vision produit. À lire en premier. |
| [01-dossier-fonctionnel.md](01-dossier-fonctionnel.md) | Périmètre, produits, rôles & permissions, modules, parcours, règles métier |
| [02-architecture-technique.md](02-architecture-technique.md) | Stack, structure du code, modèle de données, environnements, déploiement, CI/CD |
| [03-dossier-securite.md](03-dossier-securite.md) | Modèle de menace, auth/RBAC, RLS & cloisonnement, Edge Functions, secrets, journal probant, **écarts connus & risques résiduels** |
| [04-matrice-controles.md](04-matrice-controles.md) | Grille de contrôles (OWASP ASVS) à compléter par l'auditeur |
| [05-guide-acces-tests.md](05-guide-acces-tests.md) | Environnements, comptes de test (placeholders), parcours et tests à rejouer |

## Notes de lecture

- Ce dossier est **fondé sur le code réel** (migrations RLS, Edge Functions, configuration) et **déclare volontairement les faiblesses connues** (§9 du dossier sécurité) — il vise à orienter l'auditeur, qui doit vérifier indépendamment.
- Aucun secret réel n'est versionné : les identifiants/clés sont transmis **hors bande**.
- Références clés : `supabase/migrations/` (RLS, ~146 migrations), `supabase/functions/` (Edge Functions), `src/lib/supabase.ts`, `vercel.json`, `.github/workflows/ci.yml`.
