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
supabase functions deploy admin-cabinet
supabase functions deploy admin-user
supabase functions deploy admin-stats
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

## 6. Limites Phase 1 (à traiter en Phase 2)

- ❌ **Impersonation** : voir l'app comme un autre utilisateur. Demande JWT signé court + notification RGPD.
- ❌ **Onboarding wizard** : créer un nouveau cabinet depuis l'UI. Aujourd'hui, passe par la création d'organisation existante + nomination owner.
- ❌ **Stripe** : MRR est un placeholder. Phase 2 = intégration paiement réelle.
- ❌ **Feature flags** : déploiement progressif par cabinet. Pas encore.
- ❌ **Suppression définitive** : non implémentée. Suspendre + exporter avant de supprimer manuellement en SQL si vraiment nécessaire.

## 7. Tests manuels recommandés

1. Se nommer platform owner via SQL.
2. Visiter `/admin` — la mode-bar or doit apparaître.
3. Vérifier la liste des cabinets (devrait inclure même le cabinet de l'admin).
4. Suspendre un cabinet test, vérifier que ses membres ne peuvent plus se connecter, puis réactiver.
5. Rechercher un utilisateur, déclencher un reset password, vérifier la réception de l'email.
6. Vérifier que toutes les actions apparaissent dans l'audit log.
7. Visiter `/admin` avec un compte non-owner → doit rediriger vers `/`.
8. Quitter `/admin` via la mode-bar → app cabinet sans mode-bar.
