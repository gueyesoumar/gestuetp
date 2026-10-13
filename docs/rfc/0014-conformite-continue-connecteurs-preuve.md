# RFC 0014 - Conformité continue & framework de connecteurs de preuve

**Statut** : décisions actées (voir §10) - prêt à chiffrer / implémenter
**Prolonge** : RFC 0003 (moteurs de mission), RFC 0004 (Risk), RFC 0008 (entitlement unique), RFC 0012 (sécurité d'usage IA - consentement par client), RFC 0013 (framework d'édition). Piste d'audit : migrations 00178-00180.
**Objectif** : faire passer la conformité de **point-in-time** (une mission = une photo) à un **état vivant**, en **collectant automatiquement la preuve** depuis les outils de l'organisation auditée (Microsoft, Google, cloud, etc.) via des connecteurs en lecture seule. C'est la ligne qui sépare un **outil d'audit** d'un **vrai GRC**.

---

## 1. Décision de principe

1. **La preuve devient vérifiée, pas déclarée.** Au lieu que l'audité téléverse une capture d'écran, la plateforme **lit la configuration en direct** via l'API du fournisseur. La preuve est une réponse API **horodatée, attribuable, reproductible** - versée telle quelle dans la piste d'audit scellée.
2. **Le test d'un contrôle peut être programmatique.** Un contrôle porte, en plus de son évaluation manuelle, une ou plusieurs **règles de vérification** (ex. « MFA activé pour 100 % des comptes admin »). La règle produit un **verdict** (`pass` / `fail` / `warn` / `na`) + une **valeur** + la **preuve brute**.
3. **Modèle hybride, assumé.** Les connecteurs couvrent les contrôles **techniques/configurables** (30-50 % d'un référentiel cyber). Les contrôles de **gouvernance, politiques, physique, contractuel** restent déclaratifs. On ne prétend pas tout automatiser (même Vanta/Drata ne le font pas).
4. **Souveraineté d'abord.** On tire de la **métadonnée de configuration**, pas du contenu métier. Argument clé pour le marché (DCSSI Sénégal, souveraineté) et aligné RFC 0012.
5. **Module vendable.** La conformité continue est un **entitlement** activable par org (RFC 0008/0013), pas un comportement par défaut.

## 2. Ce qui existe déjà (socle à réutiliser)

| Brique | État | Réutilisation |
|---|---|---|
| Constats centrés résultat | ✅ | `assessment_findings` - un verdict `fail` génère un **constat brouillon** |
| Trust score multi-dimensions | ✅ | mapping contrôle→dimension (mig 00159) - un signal **alimente le score** |
| Mapping question↔contrôle | ✅ | `question_controls` - modèle de liaison réutilisable pour check↔contrôle |
| Piste d'audit scellée | ✅ | `activity_log` append-only, chaîne hash par org (00178-00180) - **probante** pour chaque lecture |
| Capacités / entitlements | ✅ | `org_entitlements` → `organization_capabilities` : gate du module |
| Consentement par client | ✅ | RFC 0012 - on **étend** le même mécanisme à l'autorisation connecteur |
| Pattern edge functions | ✅ | `_shared/cors.ts`, `_shared/audit-log.ts`, permissions - base des workers connecteurs |
| Faisabilité M365/Google | ✅ (indicatif) | des connecteurs claude.ai M365/Google existent déjà en session → **la forme des API est connue**. ⚠️ le produit a besoin de **sa propre app OAuth** par fournisseur, distincte du MCP de Claude |

**Conclusion** : le moteur de constats, le score, la piste d'audit et le modèle d'entitlement existent. Il manque **la couche de collecte** et **le modèle de preuve commun** qui les relie à des sources externes.

## 3. Ce qui manque

1. **Aucun framework de connecteur** : pas de stockage de connexion OAuth par org, pas de worker de collecte, pas de planification.
2. **Pas de modèle de preuve commun** : aujourd'hui une preuve = un fichier attaché. Il faut une **enveloppe normalisée** (verdict + valeur + source + horodatage + péremption) indépendante du fournisseur.
3. **Pas de notion de règle de vérification** attachée à un contrôle.
4. **Pas de fraîcheur/péremption** : une preuve n'a pas de TTL ni de détection de dérive.

## 4. Modèle cible

### 4.1 Connexion par org (OAuth lecture seule)

```
connector_integrations
  id, organization_id, provider ('entra'|'google'|'github'|...),
  status ('active'|'revoked'|'error'),
  scopes text[],                 -- minimaux, lecture seule
  secret_ref uuid,              -- renvoi vers un secret chiffré (Vault/pgsodium), JAMAIS le token en clair
  connected_by, connected_at, last_sync_at, last_error
```
- Tokens **chiffrés au repos** (Supabase Vault / pgsodium), jamais côté client, jamais en clair en base.
- RLS : une org ne voit que **ses** intégrations. Écriture via edge `service_role` uniquement.

### 4.2 Bibliothèque de checks (règles de vérification)

```
control_checks                   -- définitions, niveau PLATEFORME (réutilisables)
  id, provider, check_key ('entra.mfa_admins'|...),
  title, description,
  default_params jsonb,          -- ex. { "threshold": 100, "roles": ["GlobalAdmin"] }
  dimension,                     -- alimente le trust score
  severity_on_fail
```
Liaison check↔contrôle (par référentiel), sur le modèle de `question_controls` :
```
control_check_links
  control_id, check_id, params_override jsonb
```

### 4.3 Résultats (le modèle de preuve commun)

```
evidence_results
  id, organization_id, check_id, control_id, mission_id (nullable),
  verdict ('pass'|'fail'|'warn'|'na'),
  value jsonb,                   -- { "mfa_coverage": 0.92, "admins": 12, "without_mfa": 1 }
  raw_ref uuid,                  -- preuve brute (selon décision §10.b : stockée ou caviardée)
  collected_at, expires_at,      -- TTL → fraîcheur / dérive
  hash                           -- empreinte, versée dans activity_log
```
Un résultat est **la preuve**. L'UI, le score et la piste d'audit le traitent uniformément quel que soit le fournisseur.

### 4.4 Collecte & planification

- **Edge worker par fournisseur** (`connector-entra`, `connector-google`...) : prend une intégration, exécute les checks dus, normalise vers `evidence_results`, verse chaque lecture dans `activity_log`.
- **Dispatcher planifié** (`pg_cron` ou edge planifiée) : pour chaque intégration active, déclenche les checks arrivés à échéance. Fréquence par défaut hebdomadaire (décision §10.d).
- **Déclenchement manuel** : bouton « Rafraîchir les preuves » sur une mission / un contrôle.

### 4.5 Boucle de valeur (branchement sur l'existant)

1. `verdict = fail` → **constat brouillon** auto (`assessment_findings`) rattaché au contrôle.
2. Tout résultat → **alimente le trust score** via `check.dimension`.
3. Chaque lecture → **piste d'audit** (probante).
4. `expires_at` dépassé → preuve **signalée périmée**, re-collecte planifiée.
5. (Avec RFC Risk) `fail` sur un contrôle lié à un risque → remonte le **risque résiduel**.

## 5. Pilote - Entra ID (le premier pas le moins cher)

Un **seul connecteur Entra en lecture seule**, scopes minimaux (`Directory.Read.All`, `Policy.Read.All`, `AuditLog.Read.All`), 3 checks d'accès :

| check_key | Verdict | Contrôle type | Dimension |
|---|---|---|---|
| `entra.mfa_admins` | `pass` si 100 % des admins ont le MFA | Authentification forte | Accès |
| `entra.stale_privileged` | `fail` si compte privilégié inactif > 90 j | Moindre privilège | Accès |
| `entra.conditional_access_baseline` | `warn` si pas de politique CA de base | Gestion des accès | Accès |

Flux end-to-end : connexion → collecte → verdict → constat auto → trust score (dimension Accès) → piste d'audit, avec re-check hebdo + TTL. Prouve le concept sur le contrôle le plus universel (l'accès) en réutilisant tout le socle.

## 6. Sécurité

- **Lecture seule + moindre privilège** : scopes minimaux par fournisseur, jamais d'écriture.
- **Consentement par org auditée** : réutilise le mécanisme RFC 0012 ; la connexion est un acte explicite, journalisé.
- **Tokens chiffrés** (Vault/pgsodium), jamais exposés au front, jamais en clair.
- **Souveraineté** : métadonnée de configuration, pas de contenu ; option « verdict + valeur minimale, brut caviardé » (décision §10.b).
- **Cloisonnement** : RLS strict par org sur `connector_integrations` et `evidence_results` ; collecte en `service_role` côté edge.
- **Probité** : chaque lecture versée dans la chaîne hash `activity_log`.
- **Révocation** : déconnexion → `status='revoked'`, arrêt des jobs, conservation des résultats historiques (horodatés).

## 7. Couverture (attente honnête)

- Un tenant Microsoft seul peut automatiser **30-50 %** d'un référentiel cyber courant.
- Le reste (gouvernance, politiques, physique, contractuel) **reste déclaratif** → modèle hybride.
- Livrable utile en soi : une **cartographie « contrôle → signal → fournisseur »** par référentiel, affichant le **taux automatisable**.

## 8. Chantiers & estimation

| Lot | Contenu | Dépend de |
|---|---|---|
| **P1 - Socle** | `connector_integrations` + `evidence_results` + `control_checks`/`control_check_links` + edge `connector-entra` (3 checks) + déclenchement manuel + chiffrement tokens | - |
| **P2 - Continu** | Dispatcher planifié (`pg_cron`) + TTL/péremption + constat brouillon auto sur `fail` | P1 |
| **P3 - Valorisation** | Alimentation trust score en direct + cartographie couverture (UI) + 2e fournisseur (Google **ou** GitHub) | P1/P2 |
| **P4 - Extension** | Catalogue élargi (cloud, ITSM, SIRH), lien risque résiduel, base d'un futur TPRM | P3 |

## 9. Séquencement

P1 → P2 → P3 → P4, chaque lot testé sur snayz, promu staging→prod par le flux habituel. Gate entitlement `continuous_compliance` posé dès P1 (soft), durci plus tard.

## 10. Décisions actées

Tranchées le 2026-10-12.

**a. Granularité du mapping check↔contrôle → BIBLIOTHÈQUE RÉUTILISABLE.** Les checks sont une bibliothèque plateforme (`control_checks`), liés aux contrôles via `control_check_links` (patron `question_controls`). Un même check sert N référentiels sans duplication.

**b. Stockage de la preuve brute → VERDICT + VALEUR, BRUT OPTIONNEL.** On conserve verdict + valeur par défaut ; la réponse API brute (`raw_ref`) n'est archivée que si le client y consent (aligné RFC 0012, souveraineté).

**c. Qui connecte → LES DEUX, SELF D'ABORD.** On livre d'abord l'auto-connexion par l'org auditée (édition Entreprise), puis la connexion déléguée par le cabinet au nom du client.

**d. Fréquence → HEBDOMADAIRE, SURCHARGEABLE.** Re-check hebdo par défaut, ajustable par contrôle/entitlement. Pas de palier tarifaire sur la fréquence au départ.

**e. Fournisseur pilote → ENTRA ID SEUL.** On démarre avec Microsoft Entra seul (3 checks d'accès, §5). Google/autres en P3+.

**f. Gate entitlement → NOUVELLE CAPACITÉ DÉDIÉE.** Capacité `continuous_compliance` distincte (RFC 0008), activable à la carte, gate soft dès P1 puis durci. Module autonome vendable.

## 11. Hors scope

- TPRM / risque tiers complet (RFC distincte - réutilisera ce framework).
- Registre d'obligations & calendrier de conformité (RFC distincte - autre pilier GRC).
- Écriture / remédiation automatique dans les outils connectés (lecture seule par principe).
- Connecteurs au-delà du pilote (P3/P4).
