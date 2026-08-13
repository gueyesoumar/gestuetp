# Piste d'audit (audit trail) — document de conception

> Statut : **PROPOSITION à valider** avant tout code (lot F6, séparé).
> Objectif : « Retracer toutes les actions effectuées dans le cadre d'un audit et de la plateforme (piste d'audit), consultable côté **admin de l'organisation**. »
> Date : 2026-08-13.

---

## 1. Ce qui existe déjà (état des lieux)

Trois journaux **fragmentés**, à finalités différentes :

| Journal | Rôle | Écrit par | Lecture | UI |
|---|---|---|---|---|
| `probative_log` | Registre **inaltérable** des actes Regul (incidents, mesures), chaîné par hash + scellé TSA (RFC-3161), cron quotidien | Edge `issue-measure`, `declare-incident` | RLS régulateur (sous-arbre) | **aucune** |
| `admin_audit_log` | Actions **super-admin plateforme** (suspend cabinet, reset password…), motif obligatoire | Helper `logAdminAction` (fonctions `admin-*`) | `is_platform_owner()` | oui (`/admin`) |
| `member_audit_logs` | Actions sur les **membres** d'une org (invite, rôle, désactivation) | Insert inline dans `manage-member` | membres de l'org (`get_my_organization_id()`) | oui (drawer membre) |

**Constats :**
- Aucun de ces journaux n'est une piste d'audit **globale** consultable par un **admin d'organisation**.
- La grande majorité des actions métier (missions, évaluations, revues, entités, vocab, paramètres org…) **ne sont pas tracées**.
- Il n'existe **pas** de rôle/garde « admin d'organisation » : ce concept est **basé sur les permissions** (`platform_roles` + `user_has_cabinet_permission`), pas un rôle nommé.
- La RESTRICTIVE `require_aal2` (mig 00173) impose déjà une session **MFA (AAL2)** pour toucher aux tables → la consultation de la piste d'audit héritera de cette exigence.

---

## 2. Principe directeur

Séparer **deux préoccupations distinctes** plutôt que tout fusionner :

1. **Registre probant** (`probative_log`) — **inchangé**. Reste dédié aux actes réglementaires Regul, scellé/horodaté. C'est un objet à valeur juridique, volumétrie faible.
2. **Piste d'audit opérationnelle** (nouveau `activity_log`) — « qui a fait quoi, quand, sur quoi » à l'échelle de l'organisation. Volumétrie élevée, périmètre large, lecture par l'admin d'org.

La piste d'audit **agrège en lecture** les événements probants (union read-only) pour offrir une vue unique, sans mélanger les mécanismes d'écriture.

---

## 3. Modèle de données — `public.activity_log`

```sql
create table public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  occurred_at   timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,   -- null = système/cron
  actor_label   text,                       -- dénormalisé (nom au moment de l'action, survit à la suppression)
  action        text not null,              -- taxonomie ex 'mission.created', 'assessment.approved'
  target_type   text,                       -- 'mission' | 'entity' | 'assessment' | 'member' | 'organization' | ...
  target_id     uuid,
  target_label  text,                       -- dénormalisé (nom de la cible)
  summary       text,                       -- phrase lisible pré-calculée (FR)
  metadata      jsonb not null default '{}',-- diffs/contexte NON sensibles (jamais de secret/mdp/token)
  source        text not null default 'trigger' check (source in ('trigger','edge','system')),
  -- Chaînage cryptographique PAR ORGANISATION (décision D2) :
  seq           bigint not null,            -- n° d'ordre dans la chaîne de l'org
  prev_hash     text not null,              -- hash de l'entrée précédente de la MÊME org
  hash          text not null,              -- SHA-256 (seq|occurred_at|actor|action|target|metadata|prev_hash)
  unique (organization_id, seq),
  unique (organization_id, hash)
);

create index idx_activity_org_time on public.activity_log(organization_id, occurred_at desc);
create index idx_activity_target   on public.activity_log(target_type, target_id);
create index idx_activity_action   on public.activity_log(organization_id, action);
create index idx_activity_actor    on public.activity_log(actor_user_id);
```

**Inaltérabilité — chaînage cryptographique (décision D2) :**
- Trigger `BEFORE INSERT` `SECURITY DEFINER` `compute_activity_chain()` : autorité unique qui attribue `seq`, `prev_hash`, `hash` et force `occurred_at := now()` (anti-antidatage). Même patron éprouvé que `probative_log`.
- **Chaîne PAR ORGANISATION** (et non globale) : `pg_advisory_xact_lock(hashtext('activity_log:'||organization_id))` sérialise les inserts d'une même org **sans** faire contendre les organisations entre elles → évite le point de contention qu'aurait une chaîne unique globale sous forte volumétrie (une piste opérationnelle génère beaucoup plus d'écritures que le registre probant).
- Guard `BEFORE UPDATE OR DELETE OR TRUNCATE` → `raise exception` (comme `trg_probative_guard` / `trg_probative_no_truncate`).
- Écriture **service_role / SECURITY DEFINER uniquement** (aucune policy INSERT pour `authenticated`).
- Fonction `verify_activity_chain(org_id)` (réservée `service_role`) rejoue la chaîne d'une org et renvoie `(ok, checked, broken_seq)`.
- *Note d'exploitation :* comme les triggers d'audit écrivent dans une table chaînée à verrou par-org, toutes les mutations d'une org se sérialisent sur son insert d'audit. Acceptable au volume attendu ; à surveiller (métrique de contention) et, si besoin, dégrouper certaines familles à très haute fréquence vers la vague 2 / un canal non chaîné.

---

## 4. Mécanisme de capture (le cœur de la conception)

Deux façons de capturer, **complémentaires** :

### 4a. Triggers base de données (colonne vertébrale) — *recommandé*
Une fonction générique `SECURITY DEFINER` `log_activity_change()` attachée en `AFTER INSERT/UPDATE/DELETE` sur les **tables sensibles**. Avantages décisifs :
- **Impossible à contourner** : capture les écritures quel que soit le chemin (edge **ou** write client direct). Ex. la mise à jour du nom d'org se fait aujourd'hui en `supabase.from('organizations').update()` côté client — un trigger la capte, une instrumentation edge ne l'aurait pas vue.
- Capture l'acteur via `auth.uid()` → `get_my_user_id()`, l'`organization_id` de la ligne, et un diff `metadata` (colonnes modifiées).

Tables candidates (vague 1) : `organizations`, `entity_regulatory_profile`, `missions`, `control_assessments`, `assessment_findings`, `regulatory_measures`, `user_platform_roles`, `organization_vocab`.

### 4b. Événements sémantiques depuis les Edge Functions (compléments)
Pour les actions **qui ne sont pas un simple changement de ligne** (« questionnaire lancé », « mission clôturée avec N constats », « logo téléversé », « MFA réinitialisé »), un helper partagé :

```ts
// _shared/audit-log.ts
await logActivity(admin, {
  organizationId, actorUserId, action: 'questionnaire.launched',
  targetType: 'mission', targetId, targetLabel, summary, metadata,
})  // fail-open : un échec de log ne casse jamais l'action métier (console.error only)
```

→ **Décision D1 (mécanisme)** : triggers-backbone + événements edge (hybride) *recommandé* ; ou edge-only (plus simple, mais incomplet) ; ou triggers-only (complet mais moins « métier »).

---

## 5. Taxonomie des événements (vague 1)

| Famille | Exemples d'`action` | Capture |
|---|---|---|
| Accès & sécurité | `member.invited`, `role.assigned`, `role.removed`, `member.deactivated`, `mfa.reset` | trigger + edge |
| Organisation | `organization.updated`, `org_logo.uploaded`, `vocab.updated` | trigger + edge |
| Assujettis / entités | `entity.created`, `entity.updated`, `entity.deactivated` | trigger |
| Missions / contrôles | `mission.created`, `mission.closed`, `team.changed`, `questionnaire.launched` | trigger + edge |
| Évaluation & revue | `assessment.submitted`, `assessment.sent_to_client`, `assessment.approved`, `assessment.rejected`, `finding.created` | trigger + edge |
| Mesures / actes (Regul) | *(déjà dans `probative_log`)* → agrégés en lecture | union read-only |

Vague 2 (extension ultérieure) : demandes de preuve, relances, appels IA, exports.

---

## 6. Modèle d'accès — « admin d'organisation »

Il n'existe pas de rôle nommé. On introduit une **permission dédiée**, granulaire et assignable :

- Nouvelle permission `can_view_audit_trail` dans `platform_roles.permissions` (JSONB), attribuée par défaut au rôle « Administrateur » de chaque org.
- Vérifiée côté serveur/RLS via `user_has_cabinet_permission(uid, 'can_view_audit_trail')`, et côté front via `useCabinetPermissions` (nouvelle prop `canViewAuditTrail`).
- `is_platform_owner()` = override (voit tout, cross-org, via l'existant `/admin`).

**RLS de lecture (cloisonnement strict, anti-IDOR) :**
```sql
create policy activity_read_org on public.activity_log for select to authenticated
using (
  organization_id = public.get_my_organization_id()
  and public.user_has_cabinet_permission(public.get_my_user_id(), 'can_view_audit_trail')
);
```
Pas de sous-requête sur `activity_log` (aucune récursion). Un admin ne voit **que** sa propre organisation.

→ **Décision D3 (accès)** : permission dédiée `can_view_audit_trail` *recommandé* ; ou réutiliser une permission existante (`can_manage_roles`).

---

## 7. UI

- **Page « Piste d'audit »** réservée aux détenteurs de `can_view_audit_trail`, via une **entrée de navigation dédiée** (décision D5) gardée par un `OrgAdminRoute` (redirige si `!canViewAuditTrail && !is_platform_owner`).
- **Reprend le pattern existant** de `AdminAuditLogPage` : timeline chronologique, filtres (période, famille d'action, acteur, cible), pagination, **export CSV**.
- Chaque ligne : `occurred_at` · acteur · phrase `summary` · cible cliquable · badge de famille. Détail extensible (`metadata`).
- La vue **agrège** les événements `probative_log` du périmètre (badge « probant / scellé ») en lecture seule.

---

## 8. Volet sécurité (obligatoire — CLAUDE.md §3)

- **Cloisonnement** : RLS `organization_id = get_my_organization_id()` + permission ; aucun `organization_id` accepté du client. Un admin ne lit jamais une autre org (test avec compte non-admin **et** admin d'une autre org).
- **Pas de récursion RLS** : la policy n'interroge pas `activity_log` (helpers SECURITY DEFINER only).
- **Inaltérabilité** : guard `BEFORE UPDATE/DELETE/TRUNCATE` ; écritures service_role/SECURITY DEFINER only ; pas de policy INSERT client.
- **AAL2** : hérite de `require_aal2` (mig 00173) → consultation réservée aux sessions MFA.
- **Zéro secret dans `metadata`** : le helper et les triggers **listent explicitement** les colonnes loggées (allowlist) ; jamais de mot de passe, token, hash de session, contenu de preuve sensible. Diffs = clés + valeurs non sensibles.
- **RGPD / rétention** : la piste contient des données personnelles (acteur, cibles). Base légale = intérêt légitime (sécurité/traçabilité). Prévoir une **politique de rétention** (proposition : 24 mois glissants, purge via cron `SECURITY DEFINER`), documentée. Accès restreint aux admins.
- **Fail-open côté écriture** : un échec de journalisation ne bloque jamais l'action métier, mais est loggé (`console.error`) et surveillé.

---

## 9. Migrations & livraison (proposition de découpage)

1. **Mig A** : table `activity_log` + index + guard d'inaltérabilité + RLS lecture.
2. **Mig B** : permission `can_view_audit_trail` (seed dans les rôles admin existants) + éventuel helper.
3. **Mig C** : fonction générique `log_activity_change()` + attachement des triggers (vague 1).
4. **Edge** : `_shared/audit-log.ts` (helper `logActivity`) + instrumentation des événements sémantiques vague 1.
5. **Front** : hook `useActivityLog` + page « Piste d'audit » + garde + export CSV + prop `canViewAuditTrail`.
6. **Doc** : politique de rétention + matrice événements.

Chaque étape passe par staging (snayz) avant prod, avec test **compte non-admin** et **admin d'une autre org** (cloisonnement).

---

## 10. Décisions (verrouillées 2026-08-13)

- **D1 — Mécanisme de capture** : ✅ **hybride triggers + edge**.
- **D2 — Inaltérabilité** : ✅ **chaînage cryptographique par hash**, chaîne **par organisation** (voir §3).
- **D3 — Accès** : ✅ **permission dédiée `can_view_audit_trail`**.
- **D4 — Périmètre vague 1** : ✅ **taxonomie §5 complète**.
- **D5 — Emplacement UI** : ✅ **entrée de navigation dédiée** « Piste d'audit » (garde `OrgAdminRoute`).
- **D6 — Rétention** : ✅ **conservation illimitée** (une purge casserait la chaîne de hash ; archivage/scellement hors v1).
