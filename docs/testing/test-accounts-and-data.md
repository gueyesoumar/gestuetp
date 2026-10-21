# Comptes & données de test à provisionner (instance snayz / test)

> Prérequis pour exécuter le test fonctionnel complet (manuel + E2E Playwright).
> L'auth 2FA est **automatisée** : `tools/demo-videos/auth-auto.mjs` calcule le code TOTP
> par programme à partir du **secret base32** du compte. Chaque rôle a donc besoin de son
> trio (email, mot de passe, secret TOTP) et d'un `storageState` dédié.
>
> À provisionner par l'équipe sur l'instance de test, puis me transmettre (ou poser en
> secrets GitHub) les identifiants. Statut : v1 (2026-10-21).

## 1. Comment capturer le secret TOTP (par compte)

1. Se connecter une 1re fois avec le compte, aller dans la gestion MFA, **enrôler un TOTP**.
2. À l'enrôlement, l'app affiche un **secret base32** (sous le QR code) : **le noter**. C'est ce secret qui va dans `TEST_TOTP_SECRET`.
3. Finir l'enrôlement (saisir un code). Le facteur doit être **vérifié** (auth-auto exige un facteur TOTP vérifié).
4. Conserver email + mot de passe + secret base32 pour ce rôle.

> Comptes **dédiés aux tests** uniquement. Ne jamais réutiliser un compte réel. Jamais ces secrets en clair dans le repo (seulement en secrets GitHub / coffre).

## 2. Comptes par rôle

| Rôle | Org (édition) | Capacités/entitlements requis | storageState | Données minimales liées |
|---|---|---|---|---|
| **SA** super-admin | - (platform owner) | `is_platform_owner` | `.auth/superadmin.json` | accès console cross-cabinet |
| **CAB-O** cabinet owner | Cabinet A (audit-core) | toutes perms cabinet | `.auth/cabinet-owner.json` | voir §3 (Cabinet A) |
| **CAB-A** cabinet auditeur | Cabinet A (audit-core) | perms limitées (pas can_manage_members) | `.auth/cabinet-auditeur.json` | membre de la mission M1 |
| **REG-A** régulateur admin | Autorité R (supervision-core) | supervision, risk, vendor, policy, `can_manage_supervision_assignments`, `can_manage_vendors` | `.auth/regadmin.json` | voir §3 (Autorité R) |
| **REG-S** régulateur superviseur | Autorité R | supervision, risk ; PAS d'admin | `.auth/regsuperviseur.json` | **affecté à 1 seul assujetti** (ex. Douanes) |
| **ENT** entreprise | Entreprise E (enterprise-core) | risk (pas client_portal) | `.auth/entreprise.json` | registre de risque propre |
| **CLI** client portail | (compte role=client sur un client du Cabinet A) | - | `.auth/client.json` | mission active + 1 directive en attente |
| **VEN** candidat fournisseur | (compte role=client sur l'org fournisseur F) | - | `.auth/vendor.json` | 1 auto-évaluation ouverte (statut self_assessment) |

## 3. Données à semer (par org)

**Cabinet A (audit-core)**
- 1 CAB-O + 1 CAB-A (rôle limité).
- ≥ 2 clients (dont 1 avec compte **portail** = CLI).
- ≥ 1 mission active **M1** (moteur audit) avec CAB-A comme membre, quelques contrôles + 1 constat.
- 1 référentiel actif (ISO 27001) ; capacité `policy` pour tester Policy.

**Autorité R (supervision-core)**
- 1 REG-A + 1 REG-S (REG-S **affecté à un seul** assujetti).
- ≥ 2 assujettis (dont **1 IIC** = criticality 'eleve', ex. « Direction Générale des Douanes »).
- ≥ 1 mission de **contrôle** active sur un assujetti ; 1 incident + 1 mesure.
- Risques sur ≥ 1 assujetti (dont 1 hors seuil + 1 avec revue en retard) pour tester Portefeuille/Revue/Simulateur.
- Capacité `vendor` + 1 fournisseur **F** (avec 1 évaluation en cours sur le référentiel **PASI** et 1 candidat **VEN** invité).
- 1 directive de traitement envoyée à un assujetti (pour la boucle portail CLI/directives).

**Entreprise E (enterprise-core)**
- 1 ENT ; registre de risque propre (quelques scénarios) ; **pas** de portail client.

**Référentiels (globaux)** : vérifier présence PSSI-ES, PASI (mig 00346), ISO 27001, NIST.

## 4. Secrets GitHub (pour le workflow E2E multi-rôles)

Partagés : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VERCEL_BYPASS`, `BASE_URL` (= `https://test.gestugroup.com`).

Par rôle (convention `E2E_<ROLE>_*`) :

| Variable | Exemple | Usage |
|---|---|---|
| `E2E_SA_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | superadmin@test... | auth SA |
| `E2E_CABO_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | cabo@test... | auth CAB-O |
| `E2E_CABA_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | caba@test... | auth CAB-A |
| `E2E_REGA_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | rega@test... | auth REG-A (remplace l'actuel E2E_TEST_*) |
| `E2E_REGS_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | regs@test... | auth REG-S |
| `E2E_ENT_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | ent@test... | auth ENT |
| `E2E_CLI_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | cli@test... | auth CLI (portail) |
| `E2E_VEN_EMAIL` / `_PASSWORD` / `_TOTP_SECRET` | ven@test... | auth VEN (portail fournisseur) |

> L'existant n'a que `E2E_TEST_*` (un seul compte, régulateur) + `.auth/client.json`. La suite étendue mappe un trio de secrets => un `storageState` par rôle (via `AUTH_FILE`).

## 5. Ordre d'exécution une fois provisionné

1. Générer les `storageState` : `auth-auto.mjs` par rôle (AUTH_FILE=.auth/<role>.json).
2. Lancer la suite par parcours (J5/J6 auth+isolation → J2 régulateur → J3 vendor → J1 cabinet → J4 abonnement) - cf. `functional-coverage-map.md` §9.
3. En local : comptes dans un `.env` gitignoré ; en CI : secrets GitHub ci-dessus.

## 6. Ce dont j'ai besoin de toi pour démarrer l'automatisation

- [ ] Confirmer l'instance cible (test.gestugroup.com / snayz) et l'URL de base.
- [ ] Provisionner les 8 comptes (ou un sous-ensemble prioritaire : **REG-A, REG-S, CLI, VEN, CAB-O** d'abord) avec TOTP enrôlé + données §3.
- [ ] Me transmettre les trios (email/mot de passe/secret TOTP) OU les poser en secrets GitHub `E2E_<ROLE>_*`.
- [ ] (Optionnel) un `VERCEL_BYPASS` si l'instance de preview est protégée.

Dès que **REG-A + REG-S + CLI + VEN** sont prêts, je peux démarrer l'extension E2E sur les parcours J2/J3/J6 (les plus riches en recoins supervision/vendor/isolation).
