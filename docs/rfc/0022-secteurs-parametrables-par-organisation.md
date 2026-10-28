# RFC 0022 - Secteurs paramétrables par organisation

> Statut : **proposition (cadrage, avant tout code)**. Décisions §11 actées avec le porteur produit.
> Fondé sur : [[RFC 0001]] (graphe d'organisations, édition au runtime), [[RFC 0013]] (framework d'édition data-driven), [[RFC 0016]] (bibliothèque de templates scopée par organisation), [[RFC 0017]] (Gëstu Risk ISO 27005).
> Réutilise : le pattern « catalogue plateforme + catalogue propre à l'org » déjà en prod (`risk_scenario_templates`, `finding_templates`, `risk_criteria`), les helpers RLS (`get_my_organization_id`, `get_my_supervisor_org_ids`), la chaîne de permissions (`has_cabinet_permission`).
> Concerne : saisie du secteur d'une entité (assujetti, client, filiale, fournisseur), modèles de risque par secteur (Risk), affectations de supervision par secteur (Regul), et les tableaux de bord qui agrègent par secteur.

---

## 1. Problème

La notion de « secteur d'activité » est **figée dans le code**, alors qu'elle varie selon le client de la plateforme : un régulateur cyber (DCSSI) raisonne en secteurs publics (Fiscalité, Douanes, Infrastructure numérique de l'État), un cabinet d'audit en secteurs privés (Banque, Santé, Industrie), un autre régulateur encore autrement.

État des lieux (vérifié dans le code) :

- **Deux listes en dur**, côté front : `SECTEURS_OPTIONS` (23 libellés privés) et `PUBLIC_SECTORS` (21 libellés publics), dans [constants.ts:14-65](../../src/lib/constants.ts). Aucune table SQL, aucun enum PG.
- Le secteur d'une entité est un **texte libre** sur `organizations.sector` ([00024_organizations_extra_fields_up.sql:9](../../supabase/migrations/00024_organizations_extra_fields_up.sql)). Toutes les entités (assujettis, clients, filiales, fournisseurs) sont des lignes `organizations` ([[RFC 0001]]).
- Le **rapprochement se fait par libellé** partout :
  - modèles de risque : `risk_scenario_templates.sectors text[]` croisé avec `organizations.sector` dans `get_scenario_templates` ([00365](../../supabase/migrations/00365_scenario_templates_sector_param_up.sql)) ;
  - supervision : `supervision_assignments.scope_sector = organizations.sector` ([00326](../../supabase/migrations/00326_supervision_assignments_up.sql)) ;
  - filtres front : `o.sector === f.values.secteur`.
- Les tableaux de bord (radar, portefeuille, filtres) **ne lisent pas de catalogue** : ils dérivent les groupes des valeurs réellement présentes (`[...new Set(orgs.map(o => o.sector))]`), via le `sector` renvoyé par `get_supervised_org_portfolio` ([00317](../../supabase/migrations/00317_supervised_portfolio_up.sql)) et `buildQuadrants(orgs, 'sector')` dans [riskRadarQuadrants.ts](../../src/features/risk/riskRadarQuadrants.ts).

Conséquences : pas de gouvernance (orthographes divergentes = rapprochements cassés), pas de taxonomie propre au client, et une distinction public/privé codée en dur au lieu d'être une donnée.

## 2. Objectif

1. Rendre la liste des secteurs **paramétrable par organisation** (régulateur ou cabinet), avec une base par défaut fournie par la plateforme.
2. Permettre à un **assujetti d'hériter en lecture** de la taxonomie définie par **son** régulateur, sans voir celle des autres.
3. Rester **additif** : aucune régression sur les modèles de risque, la supervision et les tableaux de bord existants.
4. Gérer proprement le **cycle de vie** d'un secteur (ajout, désactivation) y compris l'impact sur les entités déjà rattachées, les modèles de risque et les agrégations.

## 3. Principe directeur

Répliquer un pattern **déjà en production**, et ne pas réinventer l'isolation multi-tenant. Le plus proche du besoin est `risk_scenario_templates` ([00329](../../supabase/migrations/00329_scenario_templates_up.sql)) : `owner_org_id` (null = plateforme, sinon org propriétaire), lecture propre via RLS, et **lecture descendante vers les assujettis** par un RPC SECURITY DEFINER qui ajoute `owner_org_id in (select get_my_supervisor_org_ids())`.

Conséquence : **l'architecture du besoin existe et est éprouvée.** Le seul vrai sujet de fond est la **clé de rapprochement** (libellé vs code stable), traité au §4.

## 4. Options

| Option | Clé de rapprochement | Migration de données | Renommage sûr | Effort | Risque |
|---|---|---|---|---|---|
| **A. Référentiel par org, clé = libellé** | libellé (inchangé) | **aucune** (seed only) | non (fragile) | faible | faible |
| **B. Référentiel par org, clé = code stable** | nouveau `code` | `organizations.sector` + `risk_scenario_templates.sectors[]` + `supervision_assignments.scope_sector` | oui | élevé | moyen |
| **C. Statu quo** | libellé en dur | aucune | non | nul | pas de gouvernance |

Notes :
- **A** : nouvelle table `org_sectors` seedée depuis les constantes actuelles. Les `<select>` lisent un RPC `get_sectors()`. On garde le libellé comme valeur stockée **et** comme clé de jointure. Additif, réutilise un pattern en prod. Le renommage reste fragile (le libellé est la clé) : on l'encadre par « désactiver plutôt que supprimer » et une RPC de propagation (§8).
- **B** : idem A mais avec un `code` stable ; impose de migrer 3 colonnes et 3 RPC de rapprochement. Plus propre pour le renommage, mais vraie migration de données.
- **C** : écarté (le problème §1 demeure).

## 5. Recommandation

**Option A en Phase 1.** Additive, sans migration de données, elle réutilise le pattern `risk_scenario_templates` déjà éprouvé et livre immédiatement une taxonomie paramétrable par client. La porte vers **B** (code stable) reste ouverte si le besoin de renommage sûr devient prioritaire (§15).

## 6. Modèle de données (Phase A)

```sql
create table public.org_sectors (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid references public.organizations(id) on delete cascade,  -- null = plateforme
  label text not null,
  kind text not null default 'generic' check (kind in ('generic','public','private')),
  is_active boolean not null default true,
  sort_order int,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id)
);

-- unicité du libellé dans un périmètre (plateforme, ou une org donnée)
create unique index uq_org_sectors_scope_label
  on public.org_sectors (coalesce(owner_org_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(label));
```

- `owner_org_id is null` = ligne **plateforme** (seed des listes actuelles).
- `kind` subsume la distinction publique/privée aujourd'hui codée en dur (`SECTEURS_OPTIONS` vs `PUBLIC_SECTORS`).
- `is_active = false` = **archivé** : masqué des sélecteurs, mais le libellé reste résoluble pour l'affichage.
- **Pas de FK depuis `organizations.sector`** en Phase A : la clé reste le libellé (Option A). `org_sectors` est un **référentiel de saisie et de gouvernance**, pas une contrainte d'intégrité.

Les constantes `SECTEURS_OPTIONS` / `PUBLIC_SECTORS` deviennent les **valeurs seed** (`owner_org_id = null`), elles ne sont pas supprimées (fallback).

## 7. Lecture et écriture

- Lecture : RPC `get_sectors()` (SECURITY DEFINER) renvoyant `owner_org_id is null` (plateforme) **union** `owner_org_id = get_my_organization_id()` (les miens) **union** `owner_org_id in (select get_my_supervisor_org_ids())` (ceux de mon régulateur), `is_active = true` par défaut, avec option de résolution des inactifs pour l'affichage.
- Front : un hook `useSectors(kind?)` remplace l'import de `constants.ts` dans les 7 sélecteurs ([OrganizationForm](../../src/features/organization/OrganizationForm.tsx), `OrganizationDetailsSection`, `ClientIdentitySection`, `QuickClientModal`, `EntityFormModal`, `CreateVendorModal`, `TemplateFormModal`). Les ~15 écrans qui **dérivent** déjà la liste des valeurs présentes restent inchangés.
- Écriture (CRUD du référentiel) : gated par permission (§11, §13), **AAL2**.
- Page de gestion : « Paramétrage > Secteurs » par organisation, sur le modèle de « Critères » ([RiskCriteriaPage](../../src/features/risk/RiskCriteriaPage.tsx)).

## 8. Cycle de vie d'un secteur

### 8.1 Ajout

Paresseux et sûr : un nouveau secteur devient sélectionnable, sans impact sur l'existant.
- **Modèles de risque** : il n'a aucun modèle **sectoriel** au départ, mais les **modèles généraux** (`sectors = []`) s'appliquent déjà à lui. Nudge UI : proposer d'associer des modèles sectoriels.
- **Tableaux de bord** : il n'apparaît **pas** dans le radar / les filtres tant qu'aucune entité ne le porte (apparition paresseuse, pas de groupe à zéro).

### 8.2 Désactivation (archivage) - décision §11

« Désactiver » n'efface jamais le secteur porté par une entité. Comportement en deux temps (option guidée) : au clic, si des entités sont rattachées, l'écran de confirmation affiche **deux compteurs** - « X entités » et « Y modèles de risque sectoriels » - et propose :

- **(a) Réaffecter puis archiver** : une RPC `reassign_sector(p_from, p_to)` (SECURITY DEFINER, scopée tenant, AAL2) réécrit le libellé **A → B** sur :
  - `organizations.sector` (des entités que l'appelant administre) ;
  - `supervision_assignments.scope_sector` ;
  - `risk_scenario_templates.sectors[]` **avec déduplication** (`[A,B] → [B]`, jamais `[B,B]`).
  Effet : les modèles sectoriels de A **fusionnent dans B**.
- **(b) Archiver quand même** : `is_active = false`. Les entités gardent le libellé (pastille « archivé »), les modèles sectoriels de A **continuent de matcher** par libellé, le secteur n'est plus proposé pour une nouvelle saisie ni un nouveau tag de modèle.

Suppression **dure** : réservée au cas « zéro référence » (aucune entité, aucune affectation, aucun modèle). Sinon, seule la désactivation est permise.

### 8.3 Impact sur les modèles de risque (détaillé)

- **Filet de sécurité structurel** : les modèles **généraux** (`sectors = []`) s'appliquent toujours. Aucun assujetti ne se retrouve jamais sans modèle, quelle que soit l'opération.
- Archive (b) : les modèles sectoriels de A restent valides et continuent de matcher (clé = libellé). Ils ne sont plus **taggables** à neuf.
- Réaffectation (a) : fusion A → B dans `sectors[]` avec dédup. L'écran de confirmation expose le compteur de modèles concernés avant d'agir.

### 8.4 Impact sur les tableaux de bord (détaillé)

Les dashboards dérivent de `organizations.sector`, jamais du catalogue :
- Archive (b) : le secteur **reste affiché** dans le radar / les filtres tant que des entités le portent ; il disparaît de lui-même quand plus aucune entité ne l'utilise. Aucune donnée ne disparaît.
- Réaffectation (a) : le radar **se recompose** immédiatement (le groupe A disparaît, le groupe B grossit, son **exposition moyenne est recalculée**). L'écran de confirmation prévient de cet effet.
- Garantie : comme le groupage fait `o.sector ?? 'Autre'` et qu'on ne vide jamais le secteur d'une entité, aucune entité ne bascule par erreur dans « Autre ».

## 9. Intégration par module

- **Risk** : `get_scenario_templates` et `TemplatePicker` continuent de filtrer par libellé (inchangé) ; `TemplateFormModal` lit `useSectors('public'|...)` au lieu de `PUBLIC_SECTORS`. Radar / portefeuille inchangés (dérivés).
- **Regul** : `supervision_assignments` (scope secteur) lit `useSectors` pour la saisie ; le matching par libellé est inchangé ; la réaffectation propage `scope_sector`.
- **Vendor** : `CreateVendorModal` lit `useSectors` ; `vendor_relationship_profile` continue d'exposer `sector` (texte) inchangé.
- **Dashboard / rapports** : regroupements et narratifs par `o.sector` inchangés.

## 10. Adaptation par édition ([[RFC 0013]])

Le `kind` (`public` / `private` / `generic`) permet à l'édition régulateur de privilégier les secteurs publics et à l'édition cabinet les secteurs privés, sans fork : simple filtre data-driven sur le référentiel.

## 11. Décisions actées

1. **Option A** (clé = libellé, additif) pour la Phase 1 ; Option B (code stable) différée (§15).
2. **Portée** : chaque org gère sa liste ; les **assujettis héritent en lecture** du référentiel de leur régulateur via `get_my_supervisor_org_ids()` (comme les modèles de scénarios).
3. **Désactivation guidée** (option 3) : archivage en douceur par défaut, avec réaffectation groupée optionnelle ; l'écran de confirmation montre **les deux impacts** (entités **et** modèles sectoriels).
4. **Réaffectation** : propage sur `organizations.sector`, `supervision_assignments.scope_sector` et `risk_scenario_templates.sectors[]`, **avec déduplication** (fusion A → B, pas de détag vers « généraux »).
5. **Affichage** : un secteur archivé reste affiché sur les entités qui le portent, avec pastille « archivé » ; résolution des libellés même inactifs.
6. **Permission d'édition** : nouvelle permission **`can_manage_sectors`** (les secteurs sont transverses : entités, Vendor, supervision, pas seulement Risk). Elle doit être **backfillée** dans `platform_roles.permissions` et ajoutée au gabarit `admin-create-cabinet`, pas seulement référencée dans les gardes (sinon 403 pour tous sauf platform owner).

## 12. Découpage de livraison

- **Lot 1 - Socle** : table `org_sectors` + seed depuis `constants.ts` + RPC `get_sectors` + RLS + permission `can_manage_sectors` (backfill + gabarit).
- **Lot 2 - Saisie** : hook `useSectors`, bascule des 7 sélecteurs, page « Paramétrage > Secteurs » (CRUD + activer/désactiver).
- **Lot 3 - Cycle de vie** : écran de confirmation de désactivation (double compteur + aperçu effet radar), RPC `reassign_sector` (propagation + dédup, scopée, AAL2), pastille « archivé ».
- **Lot 4 - Finitions** : nudge « associer des modèles sectoriels » à l'ajout ; filtrage par `kind` selon l'édition.

## 13. Sécurité / RLS

- **Lecture descendante uniquement via RPC SECURITY DEFINER** (`get_sectors`), jamais une policy large : un régulateur ne doit voir que la plateforme + les siens + ceux de son/ses régulateur(s). Interdiction de voir la taxonomie d'un autre tenant.
- RLS de base sur `org_sectors` : `select` = `owner_org_id is null or owner_org_id = get_my_organization_id()` ; `insert/update/delete` + `has_cabinet_permission('can_manage_sectors')` ; policy restrictive `is_aal2()`.
- `reassign_sector` : SECURITY DEFINER, **scopée au tenant** (ne réaffecte que les entités possédées/supervisées par l'appelant), jamais d'écriture cross-tenant non autorisée ; garde AAL2 + permission.
- **Pas de récursion RLS** : `org_sectors` ne s'interroge pas elle-même dans ses policies (cf. règle plateforme).
- **Backfill de permission** obligatoire (§11.6) pour éviter le 403 généralisé.

## 14. Non-régression (garanties)

- `organizations.sector` reste du `text` libellé : **zéro migration de données** en Phase A.
- Le matching par libellé (`sectors[]`, `scope_sector`, filtres) est **inchangé**.
- Les ~15 écrans qui dérivent les secteurs des valeurs présentes continuent de fonctionner sans modification.
- Les constantes deviennent le seed plateforme (fallback), elles ne sont pas supprimées.
- Les modèles **généraux** (`sectors = []`) garantissent qu'aucun assujetti ne se retrouve sans modèle.

## 15. Hors scope (Phase 1)

- **Option B (clé = code stable)** et la migration de `organizations.sector` / `risk_scenario_templates.sectors[]` / `supervision_assignments.scope_sector` : différées, à rouvrir si le renommage sûr devient prioritaire.
- Hiérarchie de secteurs (sous-secteurs) et mapping inter-référentiels (ex. NACE / ISIC).
- Fusion inter-tenant de taxonomies.
