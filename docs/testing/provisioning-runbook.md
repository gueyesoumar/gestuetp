# Runbook de provisioning des comptes de test (instance snayz / test)

> Hybride **API Auth + SQL + RPC**. Raison : créer un utilisateur (hash du mot de passe) et
> enrôler le TOTP relèvent de l'**API Auth/MFA** (pas de SQL) ; les capacités passent par la
> **RPC d'entitlement** ; orgs/rôles/profils/affectations/seed sont du **SQL**. Le métier
> (clients/assujettis/fournisseurs/portail) est fait au plus propre par les **edges/UICar ils
> posent les arêtes + cloisonnement. Exécuter sur l'instance de TEST uniquement.
>
> Prérequis shell :
> ```bash
> export SUPABASE_URL="https://snayp...supabase.co"        # URL projet test
> export SERVICE_ROLE="<service_role key>"                  # clé service_role (Dashboard > API)
> export DATABASE_URL="postgresql://postgres:...@...:5432/postgres"  # connexion directe test
> ```

---

## Partie 1 - Créer les comptes Auth (API Admin, PAS du SQL)

Crée les 8 utilisateurs (email confirmé d'emblée). Récupère chaque **UID** (champ `id`).

> **zsh** : le `!` du mot de passe déclenche l'expansion d'historique. Lance d'abord
> `set +H` (ou `setopt NO_BANG_HIST`). Vérifie aussi que `$SUPABASE_URL` et `$SERVICE_ROLE`
> sont exportés (`echo "$SUPABASE_URL"`).

```bash
set +H  # zsh : neutralise l'expansion de '!' dans le mot de passe
for ROLE in SA CABO CABA REGA REGS ENT CLI VEN; do
  EMAIL="e2e-$(echo $ROLE | tr A-Z a-z)@test.gestugroup.com"
  curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"Test-$ROLE-2026!\",\"email_confirm\":true}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('$ROLE', '$EMAIL', d.get('id','ERREUR:'+json.dumps(d)))"
done
```

Note les 8 UID : ils alimentent le SQL ci-dessous (`:sa_uid`, `:cabo_uid`, ...). Mots de passe : `Test-<ROLE>-2026!` (à changer).

---

## Partie 2 - Super-admin (SQL, adapté de `scripts/bootstrap-admin.sql`)

Remplace l'UID puis exécute :
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare v_org uuid; v_role uuid; v_user uuid;
  v_auth_id uuid := '<SA_UID>';  -- UID de e2e-sa@...
begin
  insert into public.organizations (name, slug, types, is_active, plan_id)
  values ('Gëstu (test éditeur)', 'gestu-test', array['platform'], true, null) returning id into v_org;
  insert into public.platform_roles (organization_id, name, description, is_default, permissions)
  values (v_org, 'Associé', 'Rôle test super-admin', true,
    '{"can_create_mission":true,"can_assign_team":true,"can_be_lead":true,"can_designate_lead":true,"can_delete_mission":true,"can_manage_members":true,"can_manage_clients":true,"can_edit_organization":true,"can_manage_roles":true,"can_view_audit_trail":true,"can_manage_supervision_assignments":true,"can_manage_vendors":true,"can_manage_risk_criteria":true,"can_accept_risk":true}'::jsonb)
  returning id into v_role;
  insert into public.users (auth_id, organization_id, email, first_name, last_name, is_active, is_platform_owner)
  values (v_auth_id, v_org, 'e2e-sa@test.gestugroup.com', 'E2E', 'SuperAdmin', true, true) returning id into v_user;
  insert into public.user_platform_roles (user_id, platform_role_id, assigned_by) values (v_user, v_role, null);
  raise notice 'SA ok org=% user=%', v_org, v_user;
end $$;
SQL
```

---

## Partie 3 - Orgs de test + staff (SQL)

Crée **Cabinet A** (CAB-O, CAB-A), **Autorité R** (REG-A, REG-S), **Entreprise E** (ENT).
Remplace les 5 UID. Le rôle `is_default` porte le jeu de permissions ; `can_manage_supervision_assignments`
distingue REG-A (admin) de REG-S (superviseur sans admin).

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- Helper : permissions "gestionnaire complet"
-- (owner cabinet / régulateur admin). REG-S recevra un jeu réduit.
do $$
declare
  v_cab uuid; v_reg uuid; v_ent uuid;
  v_role_cab uuid; v_role_reg_admin uuid; v_role_reg_super uuid; v_role_ent uuid;
  perms_full jsonb := '{"can_create_mission":true,"can_assign_team":true,"can_be_lead":true,"can_designate_lead":true,"can_delete_mission":true,"can_manage_members":true,"can_manage_clients":true,"can_edit_organization":true,"can_manage_roles":true,"can_view_audit_trail":true,"can_manage_supervision_assignments":true,"can_manage_vendors":true,"can_manage_risk_criteria":true,"can_accept_risk":true}'::jsonb;
  perms_super jsonb := '{"can_create_mission":true,"can_manage_members":false,"can_manage_clients":false,"can_manage_supervision_assignments":false,"can_manage_vendors":false,"can_manage_risk_criteria":false,"can_view_audit_trail":true}'::jsonb;
  perms_auditeur jsonb := '{"can_create_mission":true,"can_assign_team":false,"can_be_lead":true,"can_manage_members":false,"can_manage_clients":false,"can_manage_roles":false,"can_view_audit_trail":true}'::jsonb;
begin
  -- Cabinet A
  insert into public.organizations (name, slug, types, is_active) values ('Cabinet Test A','cabinet-test-a',array['cabinet'],true) returning id into v_cab;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_cab,'Associé',true,perms_full) returning id into v_role_cab;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_cab,'Auditeur',false,perms_auditeur) returning id into v_role_cab; -- (garde v_role_cab = auditeur pour CAB-A)
  -- CAB-O (owner, rôle Associé) :
  with r as (select id from public.platform_roles where organization_id=v_cab and name='Associé' limit 1)
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<CABO_UID>',v_cab,'e2e-cabo@test.gestugroup.com','E2E','CabinetOwner',true);
  insert into public.user_platform_roles (user_id,platform_role_id)
    select u.id, r.id from public.users u, public.platform_roles r where u.auth_id='<CABO_UID>' and r.organization_id=v_cab and r.name='Associé';
  -- CAB-A (auditeur) :
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<CABA_UID>',v_cab,'e2e-caba@test.gestugroup.com','E2E','CabinetAuditeur',true);
  insert into public.user_platform_roles (user_id,platform_role_id)
    select u.id, r.id from public.users u, public.platform_roles r where u.auth_id='<CABA_UID>' and r.organization_id=v_cab and r.name='Auditeur';

  -- Autorité R
  insert into public.organizations (name,slug,types,is_active) values ('Autorité de cybersécurité (test)','autorite-test',array['cabinet'],true) returning id into v_reg;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_reg,'Associé',true,perms_full) returning id into v_role_reg_admin;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_reg,'Superviseur',false,perms_super) returning id into v_role_reg_super;
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<REGA_UID>',v_reg,'e2e-rega@test.gestugroup.com','E2E','RegAdmin',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<REGA_UID>' and r.organization_id=v_reg and r.name='Associé';
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<REGS_UID>',v_reg,'e2e-regs@test.gestugroup.com','E2E','RegSuperviseur',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<REGS_UID>' and r.organization_id=v_reg and r.name='Superviseur';

  -- Entreprise E
  insert into public.organizations (name,slug,types,is_active) values ('Entreprise Test E','entreprise-test-e',array['cabinet'],true) returning id into v_ent;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_ent,'Associé',true,perms_full) returning id into v_role_ent;
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<ENT_UID>',v_ent,'e2e-ent@test.gestugroup.com','E2E','Entreprise',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<ENT_UID>' and r.organization_id=v_ent and r.name='Associé';

  raise notice 'orgs: cabinet=% reg=% ent=%', v_cab, v_reg, v_ent;
end $$;
SQL
```

---

## Partie 4 - Capacités / édition par org (RPC d'entitlement)

L'édition (Comply / Regul / Entreprise) **découle des capacités**. Applique le plan correspondant.
D'abord repère les slugs disponibles :
```bash
psql "$DATABASE_URL" -c "select slug, name from public.plans order by slug;"
```
Puis (plan `regulateur` confirmé ; adapte `cabinet`/`entreprise` au résultat ci-dessus) :
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- Autorité R => édition Régulateur (supervision + risk + vendor + policy via le plan)
select public.apply_entitlement_template((select id from public.organizations where slug='autorite-test'), 'regulateur');
-- Cabinet A => plan cabinet/comply (remplace par le slug réel)
select public.apply_entitlement_template((select id from public.organizations where slug='cabinet-test-a'), '<slug_cabinet>');
-- Entreprise E => plan entreprise (remplace par le slug réel)
select public.apply_entitlement_template((select id from public.organizations where slug='entreprise-test-e'), '<slug_entreprise>');
SQL
```
> Si un module manque après coup, l'octroi fin se fait par l'edge `admin-entitlement`
> (`action:grant_manual`, `key:<module>`) en tant que SA, ou par la console Abonnements.

---

## Partie 5 - Données métier (RECOMMANDÉ via l'app/edges, en tant que staff)

Le plus fiable (arêtes typées + cloisonnement portail + effets de bord) : se connecter dans
l'app et utiliser l'UI, OU invoquer les edges avec le JWT du staff. Sur l'instance de test :

| À créer | Rôle | Moyen propre |
|---|---|---|
| Client du Cabinet A (+ compte portail CLI) | CAB-O | UI « Nouveau client » (edge create-client) puis « Inviter » (edge invite-assujetti) |
| Assujettis de l'Autorité (dont 1 IIC) | REG-A | UI Assujettis (edge manage-entity ; criticité = IIC) |
| Fournisseur F (+ candidat VEN) | REG-A | UI Fournisseurs « Nouveau fournisseur » (edge create-vendor) + « Inviter le candidat » (edge invite-vendor-candidate) |
| Mission/contrôle, incident, risques | CAB-O / REG-A | UI des modules |

> Pourquoi pas tout en SQL : `create-vendor` pose l'arête `supplier` + profil (sans `types[]`),
> les invite-* créent le `client_portal_contacts` (role=client, cloisonné `client_org_id`) + le
> compte + le lien de mise en place. Reproduire ça en SQL est fragile. Si tu y tiens pour le
> scripting, dis-le-moi : je fournis les INSERT exacts (organizations + organization_relationships
> + entity_regulatory_profile + vendor_relationship_profile + client_portal_contacts).

**Affectation REG-S à UN seul assujetti** (SQL direct, après création des assujettis) :
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
insert into public.supervision_assignments (regulator_org_id, assignee_user_id, scope_type, scope_org_id)
select r.id, u.id, 'org', a.id
from public.organizations r, public.users u, public.organizations a
where r.slug='autorite-test' and u.auth_id='<REGS_UID>' and a.slug='<slug_assujetti_douanes>';
SQL
```

---

## Partie 6 - TOTP (par compte, via l'app - PAS du SQL)

L'auth E2E (`auth-auto.mjs`) calcule le code à partir du **secret base32** stocké sur le facteur.
Pour chaque compte :
1. Se connecter à l'app de test avec l'email + le mot de passe (`Test-<ROLE>-2026!`).
2. Enrôler un TOTP (gestion MFA) : **noter le secret base32** affiché sous le QR.
3. Finir l'enrôlement (saisir un code). Le facteur doit être **vérifié**.
4. Reporter le trio dans les secrets GitHub `E2E_<ROLE>_EMAIL/_PASSWORD/_TOTP_SECRET`
   (cf. `test-accounts-and-data.md` §4).

> Pré-choisir le secret par SQL (`insert into auth.mfa_factors ...`) est possible mais
> **déconseillé** : GoTrue chiffre le secret selon sa version, l'insertion directe peut ne pas
> correspondre. L'enrôlement via l'app est la voie fiable.

---

## Résumé des 6 priorités (pour démarrer l'E2E vite)
Provisionner d'abord **SA, REG-A, REG-S, CLI, VEN, CAB-O** (Parties 1→4 + les assujettis/fournisseur/portail de la Partie 5 + l'affectation REG-S + le TOTP). Dès que REG-A/REG-S/CLI/VEN ont leur TOTP, je démarre l'extension E2E (J2/J3/J6).
