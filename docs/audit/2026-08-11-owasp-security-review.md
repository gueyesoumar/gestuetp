# Audit sécurité OWASP — Gëstu ETP

> Date : 2026-08-11 · Méthode : revue adverse (attaquant + auditeur), 6 surfaces auditées en parallèle, chaque constat réfuté avant d'être retenu.
> Stack : React 18 + Vite + TS + Supabase (Auth, PostgREST, Storage, RLS). Multi-tenant : cabinet / client (portail) / groupe / régulateur (Regul).

## Résumé exécutif

Posture globale **solide sur les fondamentaux** : identité dérivée exclusivement du JWT vérifié (`auth.getUser`), aucun secret côté client, CSP en *enforce*, XSS maîtrisé (`SafeMarkdown` allowlist), journal probant réellement inviolable + ancrage TSA RFC-3161, cloisonnement cabinet cohérent sur l'essentiel de la surface edge, 70/70 tables avec RLS activée, aucune récursion RLS résiduelle, injection SQL nulle.

**Cependant**, un défaut RLS **Critique** (`users_update_self`) casse à lui seul tout le cloisonnement multi-tenant, et une chaîne de logique métier permet à un unique auditeur de fabriquer et clôturer un audit sans contrôle « quatre yeux ».

**Total : ~30 constats retenus** — **1 Critique, 5 Élevés, 6 Moyens, ~14 Faibles**, + informationnels.

| Sévérité | Nombre | Axes OWASP dominants |
|---|---|---|
| 🔴 Critique | 1 | A01 |
| 🟠 Élevé | 5 | A01, A04, A07 |
| 🟡 Moyen | 6 | A01, A04, A07, A08, A09 |
| 🟢 Faible | ~14 | A01, A03, A04, A08, A09 |

---

## 🔴 CRITIQUE

### C1 — [A01] Élévation de privilège + évasion de tenant via `users_update_self`
**Fichier** : `supabase/migrations/00003_users_up.sql:55` (jamais durcie ; `00023` note « users_update_self reste inchangée »). **Verdict : CONFIRMÉ — rien ne rattrape.**

```sql
create policy "users_update_self" on public.users for update
  to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());
```

La RLS est *row-level*, pas *column-level*. La policy autorise un `authenticated` à modifier **toutes les colonnes** de sa propre ligne — y compris `is_platform_owner` (ajouté 00067), `organization_id`, `role` (00040), `client_org_id`. Aucun `REVOKE`/`GRANT` de colonne, aucun trigger de garde (`trg_users_quota` ne réagit qu'au quota).

**Exploitation** (tout compte authentifié, y compris client portail) :
```sql
update public.users set is_platform_owner = true where auth_id = auth.uid();          -- super-admin Gëstu
update public.users set organization_id = '<uuid cabinet victime>' where auth_id = auth.uid();  -- saut de tenant (lecture/écriture)
update public.users set role = 'auditor' where auth_id = auth.uid();                    -- client sort de la neutralisation cp_*
```

**Remédiation** : trigger `BEFORE UPDATE` refusant tout changement de `is_platform_owner`/`role`/`organization_id`/`client_org_id` hors `service_role`, **ou** `REVOKE UPDATE ON public.users FROM authenticated` + `GRANT UPDATE (first_name,last_name,phone,avatar_url,job_title)`. Les changements sensibles doivent passer par `service_role`.

---

## 🟠 ÉLEVÉ

### E1 — [A01] `platform_roles` inscriptible par tout membre → auto-escalade des permissions
`supabase/migrations/00052_platform_roles_crud_policy_up.sql`. **CONFIRMÉ** (borné au propre cabinet).
Les policies INSERT/UPDATE/DELETE ne vérifient que `organization_id = get_my_organization_id()`, jamais `can_manage_roles`. Un membre porteur d'un rôle :
```sql
update public.platform_roles set permissions = permissions || '{"can_manage_roles":true,"can_manage_members":true,"can_assign_team":true}'::jsonb where id = '<son rôle>';
```
→ s'octroie les permissions cabinet sensibles (les perms effectives sont lues via `has_cabinet_permission` → `platform_roles.permissions`).
**Fix** : gater les 3 policies write par `has_cabinet_permission('can_manage_roles')`, ou réserver l'écriture au `service_role`.

### E2 — [A07] MFA non appliquée au niveau données (PostgREST)
`00155_require_aal2_up.sql` + `src/features/auth/mfa/MfaGate.tsx` + `supabase/functions/_shared/auth.ts:67`. **CONFIRMÉ.**
Un JWT **AAL1** (mot de passe seul, ou issu d'un **reset password** → `/set-password` exempté de `MfaGate`) accède en lecture/écriture aux tables tenant via l'API PostgREST directe. `MfaGate` est du React contournable ; l'AAL2 n'est exigée en RLS que sur 3 tables Regul, **en SELECT seulement** ; l'edge ne rattrape que si `MFA_ENFORCE=on` et seulement sur la surface edge. Le cloisonnement cabinet tient ; c'est la garantie « MFA obligatoire » qui est défaite.
**Fix** : porter l'exigence AAL2 dans la RLS (`RESTRICTIVE is_aal2()` en `FOR ALL` sur toutes les tables sensibles, `users` restant lisible AAL1 pour le routage), indépendamment de `MfaGate`/`MFA_ENFORCE`.

### E3 — [A04] Contournement de la séparation des devoirs (un seul auditeur produit ET valide)
`review-assessment/index.ts:112,131` + `submit-assessment/index.ts:161-217` + `create-mission` (aucune contrainte `associate_id ≠ lead_auditor_id`). **CONFIRMÉ — attaque unilatérale, sans complice.**
1. Créer une mission avec `lead_auditor_id = associate_id = soi` (create-mission valide `can_be_lead` sur le lead, jamais l'égalité ni l'associé).
2. S'auto-affecter les contrôles, `submit-assessment` → comme `isLead && hasAssociate`, passage direct `in_review` + validation `lead_review` auto-approuvée.
3. `review-assessment` : le garde anti-auto-revue (l.112) ne couvre que `lead_review`/`submitted` ; la branche `associate_review`/`in_review` (l.131) approuve → `approved`.
Le « quatre yeux » (cœur métier) est court-circuité.
**Fix** : refuser `associate_id === lead_auditor_id` à la création ; étendre le garde anti-auto-revue au stage `associate_review` (bloquer si `validated_by === auditor_id`).

### E4 — [A04] `close-mission` sans précondition d'état ni de complétude
`close-mission/index.ts:67-73,82-86,186-189`. **CONFIRMÉ.**
Seul garde : lead/associé. La fonction calcule `pending`/`rejected` mais ne les utilise pas comme gardes : clôture + rapport de conformité quel que soit l'état (même `initialization`, même assessments `draft`/`rejected`), sans jamais exiger `client_review`. Chaîné à E3 → audit complet fabriqué par une seule personne.
**Fix** : exiger un état terminal légitime + 100 % des assessments non exclus en `approved` (sinon 409). Refuser la re-clôture (`status='closure'`).

### E5 — [A01] Policies Storage des buckets `documents` (preuves) et `reports` absentes des migrations
`supabase/migrations/**` (grep négatif sur `'documents'`/`'reports'`) vs `src/features/missions/useMissionDocuments.ts:83,142`, `src/features/client-portal/missions/tabs/useClientEvidenceUpload.ts:78`. **PLAUSIBLE — à confirmer en prod.**
Le code uploade/supprime/signe directement sur ces buckets avec le JWT utilisateur, mais aucune policy `storage.objects` versionnée ne les couvre → elles existent hors-versioning (Dashboard), non auditées. Si elles se limitent à `bucket_id` (défaut déjà commis en 00128 avant correction 00153), alors injection/lecture/suppression de preuves **cross-tenant** via l'API Storage (chemins `missions/<missionId>/…` devinables).
**Fix** : matérialiser en migration la création + les policies scopées par `(storage.foldername(name))[2] = mission_id` recoupé avec `get_my_mission_ids()` / accès client, sur le modèle de 00153. **Action immédiate** : dump des policies live.

---

## 🟡 MOYEN

| # | OWASP | Constat | Réf | Verdict |
|---|---|---|---|---|
| M1 | A01 | `create-mission`/`create_mission_tx` : `associate_id` et `member_ids` non cloisonnés au cabinet (contrairement à `assign-controls`/`manage-team`) — brique de E3 | create-mission:96,114 + 00167:60-70 | CONFIRMÉ |
| M2 | A08/A04 | Table `documents` sans policy DELETE → suppression désynchronisée storage/métadonnées, preuve « supprimée » récupérable | migrations documents | CONFIRMÉ |
| M3 | A07 | Sur les 3 tables Regul protégées, seul SELECT exige l'AAL2 → écriture (dont `probative_log`) possible en AAL1 | 00155:24,29,34 | CONFIRMÉ |
| M4 | A07 | `MFA_ENFORCE=off` désactive toute l'exécution serveur de la MFA (état de rollout) | _shared/auth.ts:67 | Risque opérationnel |
| M5 | A04 | `delete-mission` sans garde de statut → destruction d'une mission clôturée + piste probante (CASCADE) | delete-mission:56-89 | PLAUSIBLE |
| M6 | A09 | `manage-team` renvoie `error.message` brut au client (seule fonction edge à le faire) | manage-team:95,118 | CONFIRMÉ |

---

## 🟢 FAIBLE

- **A04** — `submit/review/client-review/send-to-client-review/close-mission/close-cycle` utilisent `getUser` manuel, pas `authenticateCaller` → l'AAL2 ne s'y appliquera jamais. Migrer sur `authenticateCaller`.
- **A01** — `close-cycle:70-80` ne vérifie pas `is_active` (un lead suspendu peut clôturer).
- **A04** — TOCTOU/idempotence : `UPDATE` de transition sans `.eq('status', <attendu>)` (submit/review/send-to-client-review/client-review) → double-soumission/rejeu.
- **A04** — `get_subsidiary_ids(uuid)` exécutable par `authenticated` avec `parent_id` arbitraire (00057/00127) → énumération des UUID de filiales de toute org. Migrer vers `visible_target_ids()` + `REVOKE EXECUTE`.
- **A04** — `issue-measure:56-61,88-100` : mesure (jusqu'à `sanction`) émissible sans constat (`finding_ids=[]`) ni permission fine.
- **A04** — `member_audit_logs` (00049:35) : entrées de journal forgeables (`action`/`metadata` libres) ; `performed_by` bien épinglé.
- **A01** — `respond-evidence-decline:96`/`request-evidence:81` : autorisation cabinet-large, pas team-scoped.
- **A04** — `manage-entity:90-102`/`invite-assujetti:34-46` : fail-open « premier setup » (autorise si aucune permission groupe configurée).
- **A01** — `email-preferences:38-63` : endpoint non authentifié par token de désabonnement (by design, donnée peu sensible).
- **A03/A08** — validation d'upload côté client seulement + `Content-Type` de confiance sur `documents` (`.html/.htm` acceptés) ; sanitizer SVG par regex (contournable) sur `cabinet-branding` public. Imposer `allowed_mime_types` bucket + `Content-Disposition: attachment` ; remplacer le regex SVG par DOMPurify (profil SVG).
- **A09** — fuites `err.message` frontend : hooks admin (`useAdminCabinets:97`, `useAdminUserDetail:120`, `useCabinetFeatureFlags:137`, `useAdminCabinetDetail:85`, `useAdminPlans:100`, `useCabinetHealth:306`, `useFeatureCatalog:68`, `useMyCabinetQuotas:84`), `useClientActionPlan:222` (portail), `UnsubscribePage:44,66` (public).
- **A03/hygiène** — interpolation d'UUID dans filtres PostgREST sans `encodeURIComponent` (useSaveScoping, useUpdateCabinetClient, useMissionDocuments, ClientNotificationsPage, CrossCabinetBanner…) — **non exploitable** (RLS reste la frontière, valeurs = UUID de la base), hygiène seulement.
- **A08/INFO** — `probative_log` : antidatage d'`occurred_at` possible via `service_role` direct (mitigé par le sceau TSA périodique). Forcer `occurred_at := now()`.

---

## ✅ Vérifié SAIN (couverture)

- **Auth/identité** : `authenticateCaller`/`requirePlatformOwner` = `getUser` cryptographique + `is_active` + flag ; aucune identité lue depuis body/header ; redirection post-login dérivée du profil serveur (pas d'open redirect).
- **RLS** : 70/70 tables avec RLS ; tables de référence globales en `select using(true)` + écritures `service_role` only ; tables sensibles (`mission_members`, `organization_capabilities`, `organization_relationships`, `user_platform_roles` INSERT, `probative_log`) sans policy write `authenticated` ; helpers `SECURITY DEFINER` tous en `search_path=public` ; neutralisation client (`is_client_role` + helpers renvoyant vide) cohérente ; aucune récursion RLS.
- **Probatoire** : append-only (guard UPDATE/DELETE + anti-TRUNCATE), hash/seq/prev_hash calculés en base (trigger definer), verrou anti-course, `verify_probative_chain` révoquée à public/anon/authenticated, TSA RFC-3161 réellement vérifiée (PKIStatus + imprint + nonce anti-rejeu), sceau externe rendant une réécriture détectable.
- **Storage** : `client-branding` correctement scopé par chemin (00153, corrige 00128) ; `cabinet-branding` écritures via edge `service_role` + `platform_owner` ; métadonnées `documents` scopées par mission (staff + client). Path traversal des noms de fichiers neutralisé (normalisation + préfixe timestamp).
- **Frontend** : 0 `dangerouslySetInnerHTML`/`innerHTML`/`eval` ; markdown via `SafeMarkdown` (allowlist, pas de liens/HTML brut) ; CSP **enforce** (`script-src 'self'`, `object-src none`, `frame-ancestors none`, headers durcis) ; 0 secret dans le bundle ; SSRF nul ; `target="_blank"` + `rel=noopener` ; localStorage = préférences UI seulement.
- **Injection** : query builder paramétré partout ; aucun `.or()`/`.filter()`/`.rpc()` concaténé depuis l'input.

## Réconciliations adverses (constats infirmés au recoupement)
1. **`client-branding`** flaggé (00128, `bucket_id` seul) → **corrigé par 00153** (scoping chemin). Non-constat.
2. **CSP** signalée « report-only » (historique) → **enforce** dans `vercel.json` actuel. Non-constat.

## Points à vérifier en prod (non auditables statiquement)
1. Policies `storage.objects` réelles des buckets `documents`/`reports` (existence, prédicats, scoping) — cœur de E5.
2. Flag `public` des buckets `documents`/`reports` (attendu : privé).
3. Existence/portée d'une policy DELETE sur `public.documents` créée hors migration (M2).

---

## Feuille de route de remédiation (priorité)

1. **URGENT** — C1 (`users_update_self`). *Exploitable par n'importe quel compte connecté.*
2. **Immédiat** — E5 : dump des policies Storage live → confirmer/corriger + versionner.
3. **Haute** — E1 (platform_roles) ; E3+E4+M1 (chaîne SoD) ; E2/M3 (AAL2 en RLS `FOR ALL`).
4. **Moyenne** — M2/M5/M6 + migration des workflows sur `authenticateCaller`.
5. **Durcissement** — uploads (MIME serveur, SVG DOMPurify), idempotence transitions, `get_subsidiary_ids` REVOKE, fuites `err.message`.
