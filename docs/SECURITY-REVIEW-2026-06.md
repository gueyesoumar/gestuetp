# Suivi — Revue de code approfondie (ultra) — Gestu Comply

> Revue multi-agents du 2026-06-11. 56 constats remontés, 36 confirmés après vérification adversariale.
> Légende statut : ✅ corrigé · 🔧 en cours · ⬜ à traiter

## Helper introduit

`supabase/functions/_shared/auth.ts` — `authenticateCaller()` (auth.getUser + résolution profil + `is_active`), `sameCabinet()`, `ACCESS_DENIED`. À réutiliser pour toute Edge Function opérant sur des données tenant via `service_role`.

---

## Critique

| ID | Fonction / Fichier | Problème | Statut |
|----|--------------------|----------|--------|
| C1 | `ai-documents/index.ts` | Aucune auth ni cloisonnement (IDOR lecture/analyse/suppression) | ✅ auth + `callerOwnsMission` sur upload/delete/analyze |
| C2 | `reset-user-password/index.ts` | Tout membre peut réinitialiser le mot de passe d'un collègue (prise de contrôle) | ✅ `can_manage_members` + protection `can_manage_roles` |
| C3 | `smart-analyse/index.ts` | Aucune auth — fuite données + URLs signées | ✅ auth + check cabinet sur `mission_id` |
| C4 | `smart-questionnaire/index.ts` | Lecture ET écriture transverses (cache IA) | ✅ check cabinet avant lecture/écriture |
| — | `launch-questionnaire/index.ts` | (Hors revue) même schéma IDOR | ✅ corrigé en amont |

## Élevé

| ID | Fichier | Problème | Statut |
|----|---------|----------|--------|
| E1 | `assign-controls/index.ts` | IDOR `auditor_id` + pas de `is_active`/permission | ✅ `is_active` + `can_assign_team` + validation auditeurs/contrôles |
| E2 | `manage-team/index.ts` | Suppression cross-mission + add non cloisonné | ✅ delete scopé `mission_id` + validation `user_id` cabinet + `is_active` |
| E3 | `reset-user-password/index.ts` | Identité via JWT non vérifié (`decodeJwtPayload`) | ✅ remplacé par `authenticateCaller` |
| E4 | `smart-plan/index.ts` | Fuite mission/client/auditeurs (IDOR) | ✅ auth + check cabinet |
| E5 | `smart-risks/index.ts` | Fuite client/questionnaire (IDOR) | ✅ auth + check cabinet |
| E6 | `migrations/00127_fix_get_subsidiary_ids_search_path` | SECURITY DEFINER sans `SET search_path` (utilisée en RLS) | ✅ migration forward (up/down) avec `SET search_path = public` |
| E7 | `features/missions/fieldwork/useFieldworkState.ts:128-206` | approve/reject en `fetch()` brut, `res.ok` jamais vérifié | ✅ routé via `review-assessment` (stage/status décidés serveur) + erreurs surfacées |
| E8 | `features/client-portal/smart-interview/SmartPrefilledAnswers.tsx` (+ `SmartConversation.tsx`) | Réponses marquées validées malgré échec HTTP | ✅ `res.ok` vérifié, état marqué seulement si succès, erreur affichée |
| E9 | `features/group-module/useSubsidiaryDetail.ts:156-160` | `count:'exact'` compte des domaines au lieu de contrôles | ✅ comptage direct sur `controls` via `domain_id` + `.abortSignal` |
| E10 | `features/clients/ClientBrandingSection.tsx` | Logo dans bucket privé `documents` + `getPublicUrl` → 403 | ✅ nouveau bucket public `client-branding` (migration 00128), SVG exclu (anti-XSS) |

## Moyen

| ID | Fichier | Problème | Statut |
|----|---------|----------|--------|
| M1 | `invite-client/index.ts` | Création comptes client sans `is_active`/permission | ✅ `is_active` + `can_manage_members` |
| M2 | `suggest-custom-questions/index.ts` | Fuite profil client d'un autre cabinet (IDOR) | ✅ auth + check cabinet |
| M3 | `features/auth/AuthContext.tsx:42-49` | `loading=false` avant résolution profil → exposition cross-rôle | ✅ `fetchProfile` baisse `loading` dans un `finally`, jamais avant résolution |
| M4 | `useControlComments.ts` + `useMissionReviewComments.ts` + `useAssessmentFindings.ts` | Race stale, pas de garde anti-stale | ✅ `refetch(signal?)` + `.abortSignal` + garde + `useEffect` cleanup |
| M5 | `useClientMissionDetail.ts` + `useClientMissions` + `useClientActionItems` + `useClientDashboardData` + `useClientInterviews` + `ClientDocumentsPage` | setState après async sans `AbortController` | ✅ signal sur chaque fetch + gardes + try/catch + cleanup |
| M6 | `useSupervisionData.ts` + `useEntityDetail.ts` + `useCampaignDetail.ts` | Fetch sans cleanup | ✅ `.abortSignal` sur toutes les requêtes + gardes + cleanup (couvre aussi F7 supervision) |
| M7 | `features/supervision/useAuditCampaigns.ts:175-191` | `createCampaign` annonce succès malgré inserts échoués | ✅ rollback best-effort (missions+campagne) + `return null` |
| M8 | `features/organization-settings/WorkflowSettingsTab.tsx:82-101` | Cache libellés de revue jamais invalidé | ✅ purge `sessionStorage` après save |
| M9 | `features/dashboard/useDashboardStats.ts:203-205` | « Conformité moy. » mesure l'avancement | ✅ renommé `averageProgress` + labels « Avancement » partout |
| M10 | `features/reports/loadAuditReportData.ts:14-132` | Erreurs Supabase ignorées sur chaque requête | ✅ critiques → throw ; secondaires → log + dégradation |
| M11 | `features/admin/health/useCabinetHealth.ts:126-262` | Canal `error` ignoré → stats à zéro silencieuses | ✅ 11 requêtes (core → setError+stop, enrichissement → log) |
| M12 | `useSubsidiaryDetail` + `useSubsidiaries` (+ champ `error`) + `useContinuousReviews` + `useTransversalPlans` | Erreurs Supabase silencieuses | ✅ erreur gérée par requête (critique→stop, secondaire→log) |
| M13 | `features/client-portal/missions/tabs/ClientExchangesTab.tsx` (546 l.) + `ControlDetailDrawer.tsx` (460 l.) | > 150 lignes, logique métier dans l'UI | ⬜ refacto (dernier Moyen restant) |

## Faible

| ID | Fichier | Problème | Statut |
|----|---------|----------|--------|
| F1 | `features/missions/useMissions.ts:69-94` | Erreur `control_assessments` ignorée, stats nulles fictives | ⬜ |
| F2 | `features/notifications/useNotifications.ts:57-83` | `markAsRead`/`markAllAsRead` avalent les erreurs | ⬜ |
| F3 | `respond-evidence-decline/index.ts:230` (+ `update-cabinet-settings:125`, `smart-analyse:512`) | Message d'erreur technique brut renvoyé (500) | ⬜ |
| F4 | `smart-plan/index.ts:173,207` | `detail`/`raw` Claude bruts renvoyés au client | ⬜ |
| F5 | `features/supervision/SupervisionReport.tsx:165-174` | CTA principaux sans `onClick` | ⬜ |
| F6 | `features/admin/useAdminCabinets.ts` (+ `useAdminFrameworkDetail`) | Erreurs secondaires avalées | ⬜ |
| F7 | `features/group-module/useSubsidiaryDetail.ts` (+ `useSubsidiaries`, `useContinuousReviews`, `useTransversalPlans`) | Gardes `aborted` présentes mais pas de `.abortSignal()` | ✅ supervision (M6) + group-module (`.abortSignal` ajouté via M12) ; `useContinuousReviews` n'a pas d'AbortController propre |
| F8 | `features/client-portal/smart-interview/SmartInterviewContainer.tsx:53-57` | Compteur de réponses stale (prop dérivée une fois) | ⬜ |

---

## Déploiement

### Edge Functions (étapes 1-2)

```bash
supabase functions deploy ai-documents reset-user-password smart-analyse smart-questionnaire \
  assign-controls manage-team smart-plan smart-risks invite-client suggest-custom-questions \
  launch-questionnaire
```

### Migrations SQL (E6 + E10) — sur le cloud lié

```bash
supabase db push
```

Applique `00127_fix_get_subsidiary_ids_search_path` (durcissement RLS) et
`00128_client_branding_storage` (bucket public logos client).
