# Runbook — Activation de la MFA (authentification à deux facteurs)

> Procédure d'activation, de vérification et d'exploitation de la MFA sur Gëstu
> (Comply + Regul). À suivre lors du déploiement sur une instance et pour gérer
> les pertes d'appareil.
>
> **État au 2026-07-28** : MFA **active sur Regul** (enforcement serveur inclus).
> **Comply** : code livrable mais enforcement **non activé** (attend la release `main`).

---

## 1. Ce que fait la MFA

- **Méthode** : TOTP (application d'authentification), **obligatoire pour tous** les comptes (staff, super-admin, assujettis/clients). Passkey/WebAuthn optionnel prévu en **phase 2**.
- **Modèle** : Supabase Auth, niveaux d'assurance. Mot de passe → **AAL1** ; TOTP vérifié → **AAL2**. Le JWT porte le claim `aal`.
- **Trois couches** (défense en profondeur) :
  1. **Barrière client** (`src/features/auth/mfa/MfaGate`) — compte sans facteur → enrôlement forcé ; facteur en AAL1 → challenge. Exemptions : `/login`, `/set-password`, `/unsubscribe`.
  2. **Enforcement serveur edge** (`_shared/auth.ts` → `authenticateCaller`) — refuse `aal ≠ aal2`, **piloté par l'env `MFA_ENFORCE`** (`on`/absent).
  3. **RLS** (migration `00155`, Regul) — `is_aal2()` + policies **restrictives** en lecture sur `probative_log`, `regulatory_measures`, `incidents`.

**Auto-cicatrisation** : un compte non enrôlé est forcé par la barrière au login ; l'enrôlement passe par gotrue (pas par nos edge functions), donc **aucun risque de blocage** de l'enrôlement lui-même.

Commits de référence : `92284b3` (1a) · `6afc7f9` (QR client-side) · `593d07e` (issuer) · `ce467bd` (1b/1c/1d).

---

## 2. ⚠️ Règle d'or anti-lockout

**N'activer `MFA_ENFORCE=on` (et n'appliquer `00155`) sur une instance QUE si son frontend déployé porte déjà la barrière d'enrôlement.**

Sinon les comptes ne peuvent pas enrôler leur facteur → toutes les opérations edge renvoient `401` et les lectures sensibles sont vides → **blocage total**.

- **Regul** : frontend MFA en production → enforcement **activable** (fait).
- **Comply** : `main` n'a pas encore la MFA → **NE PAS** activer l'enforcement Comply avant la livraison de la MFA sur `main`.

---

## 3. Prérequis (par instance)

1. **TOTP activé** : Dashboard Supabase → Authentication → Multi-Factor Authentication → TOTP activé, « max enrolled factors » ≥ 1.
2. **Site URL correcte** : Authentication → URL Configuration → Site URL = l'URL de production (pas `localhost`). Ajouter aussi les Redirect URLs. (L'issuer MFA est de toute façon forcé côté code — « Gëstu Regul » / « Gëstu Comply » — mais la Site URL sert aux liens magiques/reset.)
3. **Topologie de déploiement Vercel** (piège connu) :
   - **Regul** = `gestu-regul.vercel.app`. Pousser `feat/regul-lot1` ne suffit pas : **promouvoir le déploiement en Production** (Vercel → Deployments → ⋯ → Promote to Production), ou régler Production Branch = `feat/regul-lot1`.
   - **Comply** = `main` (app.gestugroup.com).

---

## 4. Séquence d'activation (ordre impératif)

Exemple sur **Regul** (`--project-ref snayznxraupndrdmhbak`). Pour Comply, remplacer le ref et n'exécuter l'étape 5 (et 4 si tables présentes) qu'après la release `main`.

**Étape 1 — Déployer d'abord le filet de secours** :
```bash
supabase functions deploy admin-reset-mfa --project-ref snayznxraupndrdmhbak
```

**Étape 2 — Redéployer les fonctions utilisant `authenticateCaller`** (embarque le nouveau code ; flag encore off → aucun effet) :
```bash
for fn in ai-documents assign-controls declare-incident dispatch-feasibility \
  extract-document-metadata extract-org-chart-actors invite-assujetti invite-client \
  issue-measure manage-entity probative-log probative-seal reset-user-password run-agent \
  smart-analyse smart-plan smart-questionnaire smart-risks suggest-custom-questions; do
  supabase functions deploy "$fn" --project-ref snayznxraupndrdmhbak
done
# (ou, plus simple : supabase functions deploy --project-ref snayznxraupndrdmhbak)
```

**Étape 3 — S'assurer que les comptes actifs ont enrôlé leur TOTP** (ils passent par la barrière au login).

**Étape 4 — Appliquer la RLS (⚠️ enforce dès l'application, pas de flag)** — Regul uniquement :
```bash
"$PSQL" "$REGUL_DB" -f "<repo>/supabase/migrations/00155_require_aal2_up.sql"
```

**Étape 5 — Basculer l'interrupteur serveur** (active l'enforcement edge) :
```bash
supabase secrets set MFA_ENFORCE=on --project-ref snayznxraupndrdmhbak
```

---

## 5. Vérification

**Policies + flag :**
```bash
"$PSQL" "$REGUL_DB" -c "select tablename, policyname, permissive from pg_policies where policyname='require_aal2_select' order by 1;"
# -> 3 lignes RESTRICTIVE (incidents, probative_log, regulatory_measures)
supabase secrets list --project-ref snayznxraupndrdmhbak | grep MFA_ENFORCE
```

**Positif (pas de faux-blocage)** : se connecter à l'app (mot de passe **+ MFA** = AAL2) → dashboard / incidents / mesures se chargent, déclaration d'incident possible.

**Négatif (enforcement prouvé)** — script `/tmp/mfa_enforce_check.mjs` (voir dépôt de session) : se connecte avec **mot de passe seul** (AAL1) et vérifie :
- edge `issue-measure` → `HTTP 401` (MFA requise) ;
- lecture REST `probative_log` → `0 ligne`.

---

## 6. Réinitialisation MFA (perte d'appareil)

**Chemin recommandé — `admin-reset-mfa`** (super-admin, motif obligatoire, journalisé dans `admin_audit_log`) :
```bash
curl -s -X POST "https://snayznxraupndrdmhbak.supabase.co/functions/v1/admin-reset-mfa" \
  -H "Authorization: Bearer <JWT_SUPER_ADMIN_AAL2>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"utilisateur@exemple.sn","reason":"Perte de téléphone — ticket #123"}'
```
Le super-admin doit être lui-même en **AAL2**. La fonction supprime les facteurs du compte cible → il ré-enrôle au login suivant.

**Break-glass DBA** (non journalisé, à éviter sauf incident) :
```bash
"$PSQL" "$REGUL_DB" -c "delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'utilisateur@exemple.sn');"
```

---

## 7. Rollback

```bash
# Désactiver l'enforcement edge
supabase secrets unset MFA_ENFORCE --project-ref snayznxraupndrdmhbak
# Retirer la RLS AAL2
"$PSQL" "$REGUL_DB" -f "<repo>/supabase/migrations/00155_require_aal2_down.sql"
```
La barrière client reste (enrôlement/challenge) ; pour la retirer complètement, revert du code frontend.

---

## 8. Comply — checklist du jour de la release `main`

1. La MFA frontend est buildée sur `main` (app.gestugroup.com sert la barrière).
2. TOTP activé + Site URL correcte sur l'instance Comply.
3. Étapes 1-2 (déployer `admin-reset-mfa` + redéployer les fonctions `authenticateCaller`, `--project-ref jibblzpownddlodzmewj`).
4. Laisser les comptes s'enrôler.
5. (Optionnel) adapter `00155` aux tables sensibles Comply (ex. `control_assessments`, `assessment_findings`) et appliquer.
6. `supabase secrets set MFA_ENFORCE=on --project-ref jibblzpownddlodzmewj`.

---

## 9. Phase 2 (à venir, optionnel)

Passkey / WebAuthn comme second facteur alternatif au TOTP (connexion par biométrie/clé, anti-phishing). Nécessite un spike (gotrue v2.192 ; activation WebAuthn côté projet + `mfa.enroll({ factorType: 'webauthn' })`). Le TOTP reste la base garantie pour 100 % des comptes.
