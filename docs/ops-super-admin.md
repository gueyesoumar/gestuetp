# Configuration opérationnelle — Super-admin Gëstu

Ce document décrit comment activer et opérer la console super-admin Phase 1.

## 1. Migrations à appliquer

```bash
supabase db push
```

Vérifier les 3 nouvelles migrations 00067, 00068, 00069 :

```sql
-- Vérification
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'is_platform_owner';

SELECT count(*) FROM public.admin_audit_log;          -- doit retourner 0 au départ
SELECT slug, monthly_price_eur FROM public.plans;     -- 3 plans seedés
```

## 2. Nomination du premier platform owner

**Sécurité critique** : `is_platform_owner` est volontairement non éditable via UI.
La nomination se fait au SQL Editor par un compte ayant l'accès admin Supabase.

### Cas A — l'utilisateur a déjà un profil dans `public.users`

(C'est-à-dire : il a déjà été invité comme membre d'un cabinet, il s'est connecté au moins une fois, etc.)

```sql
UPDATE public.users
SET is_platform_owner = true
WHERE email = 'oumar@gestucomply.com';
```

### Cas B — l'utilisateur vient juste d'être créé dans Supabase Auth (`auth.users` uniquement)

Créer un compte dans **Supabase Dashboard → Authentication → Users → Add user** ne crée
PAS de ligne `public.users`. L'`UPDATE` ci-dessus retourne alors « 0 rows updated » sans erreur.

Il faut d'abord créer la ligne `public.users` rattachée à une organisation (par exemple
une organisation « Gëstu Group » dédiée à l'éditeur). Le bloc ci-dessous est idempotent —
on peut le rejouer sans casser quoi que ce soit :

```sql
DO $$
DECLARE
  v_auth_id uuid;
  v_org_id  uuid;
BEGIN
  -- Récupérer l'auth_id depuis l'email
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'oumar@gestugroup.com';
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'auth.users introuvable — créer d''abord le compte dans Supabase Auth';
  END IF;

  -- Créer (ou récupérer) l'organisation Gëstu Group
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'gestu-group';
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, types, is_active)
    VALUES ('Gëstu Group', 'gestu-group', ARRAY['platform']::text[], true)
    RETURNING id INTO v_org_id;
  END IF;

  -- Insérer le public.users avec le flag, ou le mettre à jour s'il existe
  INSERT INTO public.users (
    auth_id, organization_id, email, first_name, last_name,
    is_active, is_platform_owner, role
  )
  VALUES (
    v_auth_id, v_org_id, 'oumar@gestugroup.com', 'Oumar', 'Gueye',
    true, true, 'auditor'
  )
  ON CONFLICT (auth_id) DO UPDATE
    SET is_platform_owner = true,
        is_active = true;
END $$;
```

### Vérification

```sql
SELECT u.email, u.first_name, u.last_name, u.is_active, u.is_platform_owner, o.name AS organization
FROM public.users u
JOIN public.organizations o ON o.id = u.organization_id
WHERE u.is_platform_owner = true;
```

Pour ajouter un second owner, répéter le bloc B avec un autre email/auth_id.

Pour retirer le flag :

```sql
UPDATE public.users SET is_platform_owner = false WHERE email = 'ancien@gestucomply.com';
```

⚠️ Garder une trace papier / Notion de qui est owner et pourquoi. La table `admin_audit_log`
ne capture que les actions effectuées via la console — pas les `UPDATE` SQL directs.

⚠️ Après nomination, **se déconnecter / reconnecter** pour rafraîchir le profil chargé côté
client — sinon `useAuth().profile.is_platform_owner` reste à `false` jusqu'à la prochaine
session.

## 3. Déploiement des Edge Functions

```bash
# Phase 1
supabase functions deploy admin-cabinet
supabase functions deploy admin-user
supabase functions deploy admin-stats

# Phase 2
supabase functions deploy admin-view-user
supabase functions deploy admin-feature-flags
supabase functions deploy admin-create-cabinet
supabase functions deploy admin-delete-cabinet

# Phase 2.5 — overrides feature flags par cabinet
supabase functions deploy admin-feature-flag-overrides

# Phase 3 — monitoring (redéployer aussi les 5 Edge Functions IA pour activer le logging)
supabase functions deploy admin-monitoring-stats
supabase functions deploy smart-questionnaire
supabase functions deploy smart-analyse
supabase functions deploy smart-plan
supabase functions deploy smart-risks
supabase functions deploy ai-documents

# Phase 4 — frameworks management UI
supabase functions deploy admin-framework
supabase functions deploy admin-framework-ai-draft
```

Variables d'environnement à vérifier :
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` : déjà présentes (toutes les fonctions les utilisent)
- Aucune nouvelle variable.

## 4. Recommandations sécurité

### 2FA obligatoire pour les owners
Activer `Multi-Factor Authentication (TOTP)` sur les comptes platform owner depuis Supabase Auth → Users.
Un compte super-admin compromis = accès à toutes les données plateforme.

### Rotation des owners
Recommandation : revoir la liste des owners chaque trimestre. Retirer le flag dès qu'un membre quitte ou change de fonction.

### Audit régulier
Une fois par mois, exporter le CSV de l'audit log et archiver dans un coffre.

```sql
-- Vue rapide des actions des 30 derniers jours
SELECT created_at, action, target_type, reason,
       (SELECT email FROM public.users WHERE id = actor_id) as actor
FROM public.admin_audit_log
WHERE created_at > now() - interval '30 days'
ORDER BY created_at DESC;
```

## 5. Actions disponibles depuis la console

| Action | Édition | Effet | Réversible ? |
|--------|---------|-------|--------------|
| Suspendre un cabinet | `organizations.is_active = false` | Membres perdent l'accès aux missions/données via RLS | Oui (Réactiver) |
| Réactiver un cabinet | `organizations.is_active = true` | Restaure l'accès | — |
| Exporter un cabinet (CSV) | Lecture | Génère un fichier CSV avec membres + missions | — (lecture seule) |
| Réinitialiser le mot de passe | Supabase Auth recovery | Envoie un email de récup. à l'utilisateur | — (l'utilisateur définit son nouveau MDP) |
| Désactiver un compte utilisateur | `users.is_active = false` | L'utilisateur ne peut plus se connecter | Oui (Réactiver) |

## 6. Phase 2 (livrée)

- ✅ **Mode aperçu utilisateur** (lecture seule) — `/admin/utilisateurs/:id` avec motif obligatoire + notification RGPD au target. Pas de vraie impersonation (voir BRAND.md §12 pour le pourquoi).
- ✅ **Onboarding wizard** — bouton « Onboarder un cabinet » sur `/admin/cabinets`. Crée org + rôle Associé + auth user + email de définition de mot de passe en une seule transaction.
- ✅ **Feature flags globaux** — `/admin/feature-flags`. 4 flags seedés (`weekly_digest_email`, `smart_questionnaire_v2`, `ai_pre_review`, `multi_framework_dashboard`). Hook `useFeatureFlag('slug')` côté client.
- ✅ **Suppression définitive** — bouton dans la danger zone du cabinet. Triple confirmation (nom exact + mot SUPPRIMER + motif). Refus si platform owner présent. Refus si missions actives non clôturées (sauf force=true). Snapshot léger en metadata du log avant DELETE CASCADE.

## 6bis. Page Santé / Monitoring

Visible sur `/admin/monitoring` (sidebar « Santé / Monitoring »). Trace les appels Anthropic
de toutes les Edge Functions IA (`smart-questionnaire`, `smart-analyse`, `smart-plan`,
`smart-risks`, `ai-documents`).

**Données affichées** :
- KPI 30j : nombre d'appels, coût USD estimé, tokens consommés, taux de succès, emails envoyés
- Edge Functions : breakdown par fonction (appels, succès %, durée moyenne, coût)
- Top cabinets : ceux qui consomment le plus d'IA, triés par coût
- Storage : taille des documents par cabinet
- Emails par type (depuis `email_log`)
- Liste des derniers échecs (max 50)

**Source des coûts** : table `ai_calls_log` populée par chaque Edge Function après son
appel à Anthropic. Le calcul utilise des constantes hardcodées dans
`supabase/functions/_shared/log-ai-call.ts` :

| Modèle | Input ($/M tokens) | Output ($/M tokens) |
|--------|--------------------|---------------------|
| Sonnet 4 / 4.5 / 4.6 | 3 | 15 |
| Haiku 4.5 | 1 | 5 |
| Opus 4 / 4.7 | 15 | 75 |

**À mettre à jour** quand Anthropic ajuste ses prix. Les anciens log restent inchangés
(coût figé à l'instant T) — pas de recalcul rétroactif.

**Données rétroactives** : la table `ai_calls_log` ne capture que les appels postérieurs
au déploiement de la migration 00074. Pas d'historique antérieur.

## 6ter. Frameworks management UI

Page `/admin/frameworks` permet de créer / éditer les référentiels et leurs contrôles
sans passer par SQL.

**Deux modes de création** :
- **Manuel** (bouton « Nouveau (manuel) ») → formulaire vide, à compléter à la main
- **IA-assisted** (bouton « Générer avec IA ») → wizard 3 étapes :
  1. Identité du référentiel (nom, slug, version, publisher, catégorie)
  2. PDFs joints (0-5, ≤ 32 Mo chacun) + instructions libres
  3. Aperçu du brouillon généré → création en chaîne (framework + domains + controls)

**Édition** sur `/admin/frameworks/:slug` :
- Métadonnées éditables inline (nom, version, publisher, description, catégorie)
- Domaines en accordéon avec drag-handle ↑↓ (boutons), édition inline, ajout/suppression
- Contrôles inline : code, name, description, guidance — édition rapide
- Toggle « Désactivé » (soft-delete) sur framework / domaine / contrôle

**Garde-fous** :
- Hard-delete d'un framework refusé si missions actives référencent → utiliser le soft-delete
- Hard-delete d'un domaine refusé si `control_assessments` existent
- Hard-delete d'un contrôle refusé si `control_assessments` existent
- Soft-delete (`is_active = false`) toujours possible — invisible côté cabinet, données existantes intactes

**Brouillon IA** : badge `was_ai_generated` reste affiché jusqu'à ce que l'admin le retire
manuellement (« Marquer comme publié »). Toujours **relire les contrôles** avant publication —
Claude peut halluciner sur des codes ou descriptions.

## 7. Limites restantes (Phase 3 si besoin)

- ❌ **Stripe** : MRR reste placeholder. Pas demandé pour l'instant.
- ❌ **Impersonation full** : voir l'app comme un autre utilisateur en mode mutation. Risques d'audit. Non livré.
- ❌ **Tickets support** : besoin pas cadré (Linear ? Notion ? in-app ?).
- ❌ **Bulk import CSV des frameworks** : actuellement IA ou saisie inline. CSV en Phase 4 si besoin.
- ❌ **Versioning frameworks** : pas de snapshot historique. Phase 4.

## 7. Tests manuels recommandés

1. Se nommer platform owner via SQL.
2. Visiter `/admin` — la mode-bar or doit apparaître.
3. Vérifier la liste des cabinets (devrait inclure même le cabinet de l'admin).
4. Suspendre un cabinet test, vérifier que ses membres ne peuvent plus se connecter, puis réactiver.
5. Rechercher un utilisateur, déclencher un reset password, vérifier la réception de l'email.
6. Vérifier que toutes les actions apparaissent dans l'audit log.
7. Visiter `/admin` avec un compte non-owner → doit rediriger vers `/`.
8. Quitter `/admin` via la mode-bar → app cabinet sans mode-bar.
