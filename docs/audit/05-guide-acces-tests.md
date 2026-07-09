# Guide d'accès & jeux de test — Gëstu ETP

> À l'usage de l'auditeur externe pour rejouer les parcours. **Ce document ne contient aucun secret réel** : les identifiants et clés sont des placeholders, à transmettre **hors bande** (canal sécurisé), jamais versionnés.

## 1. Environnements

| Produit | URL | Instance Supabase | Branche |
|---|---|---|---|
| Comply (prod) | `https://app.gestugroup.com` | `jibblzpownddlodzmewj` | `main` |
| Regul (démo) | `https://gestu-regul.vercel.app` | `snayznxraupndrdmhbak` | `staging` |

> Recommandation : fournir à l'auditeur un **environnement de recette dédié** (données de test), distinct de la production, pour les tests intrusifs.

## 2. Comptes de test à fournir (hors bande)

| Rôle | Produit | Identifiant | Mot de passe |
|---|---|---|---|
| Super-admin plateforme | Comply | `<à fournir>` | `<hors bande>` |
| Membre cabinet (auditeur) | Comply | `<à fournir>` | `<hors bande>` |
| Client portail | Comply | `<à fournir>` | `<hors bande>` |
| Staff régulateur | Regul | `<à fournir>` | `<hors bande>` |
| Contact assujetti | Regul | `<à fournir>` | `<hors bande>` |

> ⚠️ Les comptes de test créés pendant le développement (ex. sur l'instance Regul) doivent être **purgés** ou isolés avant de donner accès à un tiers.

## 3. Parcours à rejouer

### Comply
1. **Cycle mission** : créer une mission (assistant 6 étapes) → cadrage → planification → travaux (évaluer un contrôle) → revue interne → revue client → clôture (rapport).
2. **Portail client** : inviter un contact depuis une mission → le contact définit son mot de passe → il ne voit que sa mission.
3. **Super-admin** : gérer un cabinet, un utilisateur, un référentiel ; vérifier le journal `admin_audit_log`.

### Regul
1. **Registre** : créer un assujetti + profil réglementaire (criticité).
2. **Contrôle** : planifier une mission de contrôle sur le référentiel PSSI-ES.
3. **Mesure** : produire un constat puis prononcer une mesure graduée ; vérifier l'ancrage dans `probative_log`.
4. **Incident** : déclarer un incident (régulateur et assujetti) ; vérifier les échéances.
5. **Cloisonnement** : se connecter comme assujetti A et confirmer l'absence d'accès aux données de l'assujetti B.
6. **Portail** : inviter un contact assujetti (fiche assujetti → « Gérer les accès »).

## 4. Tests de sécurité suggérés

- **Cloisonnement horizontal** : tenter d'accéder aux ressources d'un autre tenant (missions, documents, incidents) via l'API REST Supabase avec le token d'un client → doit renvoyer vide (RLS).
- **Élévation verticale** : appeler une Edge Function `/admin` avec un token non super-admin → 401/403.
- **Gardes Edge Functions** : appeler `invite-assujetti` / `declare-incident` avec un `entity_id` hors périmètre → 403 (garde sous-arbre / own-org).
- **Journal probant** : exécuter `select * from verify_probative_chain();` sur l'instance Regul → chaîne intègre ; tenter un UPDATE/DELETE sur `probative_log` → exception.
- **Énumération** : tester `resolve-tenant-by-hostname` et les endpoints publics.
- **XSS** : cibler `ActionsList.tsx` (R2) et les rendus PDF/canvas (R3).

## 5. Éléments techniques à donner en lecture

- Repo (branche `main` + `staging`), en particulier `supabase/migrations/`, `supabase/functions/`, `src/`.
- Export des policies RLS effectives (`select * from pg_policies;`).
- `vercel.json`, `.github/workflows/ci.yml`, `tsconfig.app.json`, `package.json` + `package-lock.json`.
- Les dossiers de ce répertoire `docs/audit/`.
