# RFC 0011 — Assistant d'onboarding in-app (agent conversationnel ancré)

- **Statut** : décisions A→D **actées** (§9) ; prêt pour implémentation (Lot 1)
- **Date** : 2026-09-25
- **Périmètre** : aide à la prise en main de la plateforme par les utilisateurs (in-app), côté **auditeurs/staff d'abord** ; extension portail client ultérieure
- **Prérequis** : sous-système d'aide `src/features/support/help/*` (articles + `HelpAudience`), patron agent `run-agent`, `AuthContext`/`useFeatureFlag`
- **Ne remplace pas** : la RFC 0010 (boucle d'amélioration continue, admin/code-facing) ni l'IA côté auditeur (SmartScope/SmartPlan). Ce RFC est **user-facing, data-minimal, lecture seule**.

---

## 1. Contexte & objectif

Les nouveaux utilisateurs (auditeurs/staff en premier) doivent « apprendre » la plateforme : où trouver une fonction, comment enchaîner les étapes d'une mission, que signifie tel écran. Aujourd'hui l'aide existe sous forme d'**articles** (`src/features/support/help/`) mais elle est **passive** : il faut aller la chercher, page par page.

Ce RFC propose un **assistant d'onboarding conversationnel**, présent en permanence sous forme de **widget flottant**, qui :

1. répond aux questions « **comment faire X** » en s'appuyant sur les articles d'aide existants (réponses **ancrées**, pas inventées) ;
2. tient compte du **contexte** : rôle de l'utilisateur et **page courante** (« comment faire ça *ici* ») ;
3. peut **proposer et lancer un tour guidé** interactif (surlignage pas-à-pas de l'UI) au bon moment.

**Choix produit acté** (échanges préalables) : comportement = *Q&R contextuel + tours guidés*, **sans actions exécutées par l'agent** (pas de copilote qui agit à la place de l'utilisateur). Audience initiale = **auditeurs/staff**.

## 2. Décision d'architecture fondatrice : pourquoi PAS « Managed Agents »

La demande initiale évoquait **Managed Agents** (le harnais d'agents hébergé par Anthropic). Après vérification de la doc officielle, il est **écarté** pour ce besoin, pour deux raisons dirimantes :

- **Non éligible ZDR / BAA** — Managed Agents est *stateful par conception* (sessions longues, historique + état sandbox conservés côté Anthropic), ce qui l'exclut du Zero-Data-Retention. Or la **décision B de la RFC 0010** exige ZDR/no-training. La **Messages API classique, elle, est éligible ZDR**.
- **Surdimensionné** — sandbox Linux (bash, fichiers, navigateur), sessions facturées ~0,08 $/h : inutile pour du Q&R ancré *sans actions*. Managed Agents ne se justifierait que pour un futur « copilote actionnable », explicitement hors périmètre ici.

**Moteur retenu** : une **Edge Function `onboarding-assistant`** qui appelle la **Messages API en streaming**, exactement dans la lignée de [`run-agent`](../../supabase/functions/run-agent/index.ts) (boucle tool-use Anthropic, `authenticateCaller`, gate feature-flag, outils lecture seule). Clé API **serveur-only**, jamais dans le navigateur.

## 3. Existant (à ne pas réinventer)

- **Articles d'aide** — `src/features/support/help/` (`HelpBrowse`, `HelpArticleView`, `useHelpArticles`, `helpContent.ts`), table help, typage `HelpAudience = 'all' | 'staff' | 'client'` (`database.types.ts`). → **base de connaissance native** de l'assistant.
- **Patron agent** — `supabase/functions/run-agent/index.ts` : OPTIONS/CORS → `ANTHROPIC_API_KEY` → `authenticateCaller` → gate owner → gate flag → boucle tool-use `/v1/messages` avec outils lecture seule + outil de sortie structurée. → **brique à cloner** (sans le gate owner-only, mais avec gate rôle).
- **Auth caller** — `_shared/auth.ts` : `authenticateCaller(admin, req)` (Bearer vérifié via `getUser`, profil `public.users`, `is_active`, AAL2 optionnel). `CallerProfile = { id, organization_id, is_active, role }`.
- **CORS** — `_shared/cors.ts`.
- **Journalisation coût** — `_shared/log-ai-call.ts` (table `PRICING`, `ai_calls_log`).
- **Contexte front** — `useAuth()` (rôle, `is_platform_owner`, `organization_id`) ; `useEdition().hasCapability` (module) ; `useLocation()` (route).
- **Précédent widget global conscient de la route** — `src/features/support/recorder/RecorderContext.tsx` : provider monté sous le router, lit `useLocation().pathname`, rend un **HUD flottant** (`RecordingHud`). → **patron exact** du montage du widget.
- **Feature flags** — `useFeatureFlag(slug)` (kill-switch global → override org → plan → off, cache `sessionStorage`).
- **Shells** — cabinet = `src/components/layout/AppLayout.tsx` ; portail = `ClientLayout.tsx` ; admin = `AdminLayout.tsx`. Audience initiale staff → montage dans **`AppLayout`**.

**Constat greenfield** : **aucun streaming** (SSE/`ReadableStream`) n'existe encore dans le repo. C'est le seul vrai investissement technique du chantier.

## 4. Principes directeurs

1. **Ancrage avant génération** — l'assistant répond **à partir des articles d'aide** ; hors périmètre, il le dit et oriente vers le support, il n'invente pas.
2. **Lecture seule, aucune action** — l'agent n'a **aucun outil mutatif** ; il ne navigue/ne remplit/ne lance rien à la place de l'utilisateur (les tours sont du code UI déclaratif, pas des actions d'agent).
3. **Clé serveur-only** — `ANTHROPIC_API_KEY` reste dans l'Edge Function ; le navigateur ne voit que le flux de texte.
4. **Contexte minimal** — on envoie *rôle + route + question* (+ historique de la conversation courante), **pas** l'enregistrement utilisateur complet ni de données métier sensibles.
5. **ZDR / no-training** — Messages API en mode ZDR (aligné décision B de la RFC 0010).
6. **Le texte est une donnée, pas une instruction** — défense anti-injection : la question et le contenu des articles sont des données ; l'agent ne suit pas d'instructions qui y seraient cachées.
7. **Gate + flag** — visibilité derrière `authenticateCaller` (rôle) + `useFeatureFlag('support_agent_onboarding')`, **OFF par défaut**.
8. **Budget maîtrisé** — plafond de coût par conversation ; modèle léger par défaut.

## 5. Proposition — architecture

```
Widget (AppLayout, staff)
  │  question + contexte {rôle, route, module}
  ▼  fetch (ReadableStream)              ┌─ authenticateCaller (rôle, is_active)
Edge Function `onboarding-assistant` ────┤─ gate flag support_agent_onboarding
  │                                      ├─ outil LECTURE SEULE: search_help(query) → articles (filtrés par HelpAudience)
  │                                      ├─ outil: suggest_tour(tour_id) → renvoie un id de tour déclaratif
  │                                      └─ Messages API (ZDR) en STREAMING → SSE
  ▼
Rendu token-par-token dans le chat + bouton « Lancer le tour » si suggest_tour
Tours guidés : config déclarative front (lib de tour) — étapes = code, jamais généré à la volée
```

### 5.1 Base de connaissance (ancrage)
Les articles d'aide sont la source. Deux approches possibles (**décision A**) : (i) l'agent appelle un outil `search_help(query)` qui interroge la table help côté serveur (toujours **filtré par `HelpAudience` selon le rôle du caller**) ; (ii) en complément, une **« carte de la plateforme »** curatée (sommaire des modules/écrans/actions) injectée dans le system prompt pour l'orientation générale.

### 5.2 Tours guidés
Le contenu des tours est **déclaratif** (liste d'étapes : sélecteur d'élément + texte), versionné dans le front. L'agent ne fait que **proposer** un tour existant (`suggest_tour(tour_id)`) ; le widget affiche un bouton « Lancer le tour » qui exécute la lib de tour (**décision C actée : `driver.js` — licence MIT**, léger et sans dépendance ; thème inliné aligné sur BRAND.md). *NB : `Shepherd` avait été retenu initialement mais s'avère relicencié **AGPL-3.0** (copyleft réseau) — écarté pour un SaaS propriétaire ; cf. CLAUDE.md §3 « dépendances ».* Déclenchement possible aussi à la **1ʳᵉ visite** d'un module (table `onboarding_tours_seen`, cf. décision B).

### 5.3 Streaming
L'Edge Function renvoie un `ReadableStream` (SSE : `text/event-stream`). Le front consomme via `fetch` + `response.body.getReader()` (le helper `invokeEdgeFunction` étant bloquant, l'appel streaming se fait par `fetch` direct sur l'URL de la fonction **avec le Bearer de session**). Fallback non-streaming si le flux échoue.

## 6. Modèle de données

Migration **00258** (n° suivant après 00257), additive :

- **Flag** `support_agent_onboarding` (`feature_flags`, `is_globally_enabled=false`) — kill-switch DPA/ZDR.
- **(décision B actée = persistance)** table `onboarding_conversations` (`id`, `user_id`, `organization_id`, `route`, `messages jsonb`, `answered boolean`, `created_at`) + `onboarding_tours_seen` (`user_id`, `tour_id`, `seen_at`). RLS : chaque utilisateur ne lit/écrit **que ses propres** conversations (helper `get_my_user_id()` SECURITY DEFINER, **pas** de récursion) ; écritures serveur via service_role. Owner peut lire en agrégat pour la boucle d'amélioration. **Rétention RGPD** : purge programmée (ex. 90 j) ou anonymisation, à documenter.
- `_shared/log-ai-call.ts` : ajouter `'claude-onboarding'` à la table `PRICING`.
- `database.types.ts` : maintenu **à la main** (jamais `supabase gen types`).

Chaque migration a son `_up` **et** son `_down`.

## 7. Edge Function & sécurité serveur

`supabase/functions/onboarding-assistant/index.ts` :

- OPTIONS/CORS (`_shared/cors.ts`).
- `authenticateCaller` → **rôle staff/auditor** requis (v1) ; rejet 401/403 propre (`readInvokeError` côté front).
- Gate flag `support_agent_onboarding` (lecture `feature_flags.is_globally_enabled`).
- Outils **lecture seule uniquement** : `search_help` (scopé `HelpAudience` par rôle), `suggest_tour` (renvoie un id, ne fait rien). **Aucun outil d'écriture.**
- Messages API **ZDR**, modèle **Haiku 4.5** par défaut (décision D), streaming SSE.
- **Anti-injection** : system prompt qui fence question + articles comme données ; refus des demandes hors onboarding (pas d'exfiltration, pas d'exécution).
- **Budget** : plafond tokens/coût par conversation ; `log-ai-call` pour le suivi.
- **Data-minimization** : entrée = `{ role, route, module, question, history[] }` ; pas de PII métier.

## 8. UX (front)

- **Provider global** `OnboardingAssistantProvider` façon `RecorderContext`, monté dans `AppLayout` (staff). Lit `useAuth()` + `useLocation()`.
- **Widget flottant** : bulle en bas à droite → panneau de chat ; rendu **token-par-token** ; état « recherche dans l'aide… » sur `search_help` ; bouton « Lancer le tour » sur `suggest_tour`.
- **Composants ≤ 150 lignes** (règle CLAUDE.md) : découpage `OnboardingBubble` / `OnboardingPanel` / `OnboardingMessage` / `useOnboardingChat` / `tours/*`.
- **Gate visibilité** : `useFeatureFlag('support_agent_onboarding')`.
- **JSX §5** : accents UTF-8 réels ; entités seulement dans le texte JSX, jamais dans les strings JS.

## 9. Décisions actées (2026-09-25)

- **A · Base de connaissance** — ✅ **Articles d'aide (`search_help`, filtrés par `HelpAudience`) + « carte de la plateforme » curatée** injectée dans le system prompt. Détail ancré + orientation navigation fiable.
- **B · Persistance des conversations** — ✅ **Stockées avec RLS** (`onboarding_conversations`, chacun ne voit que les siennes). Audit + reprise + alimentation de la boucle RFC 0010 (questions sans réponse → suggestions). Rétention RGPD à documenter.
- **C · Bibliothèque de tours** — ✅ **driver.js** (licence **MIT**, ~5 kB, sans dépendance, très adopté) ; thème inliné aligné BRAND.md. *Correction : `Shepherd` (retenu d'abord) est passé en **AGPL-3.0** → écarté pour un produit propriétaire.*
- **D · Modèle & budget** — ✅ **Haiku 4.5 par défaut + Sonnet 5 en repli** (questions complexes) ; **plafond dur 0,50 $/conversation**.

## 10. Plan par lots

- **Lot 0** — cette RFC + artifact visuel, PR docs-only de discussion (ce lot).
- **Lot 1 (backend)** — migration 00258 (flag + tables selon B), Edge Function `onboarding-assistant` en streaming + outils lecture seule, `log-ai-call`, budget.
- **Lot 2 (widget chat)** — provider global + widget + client de streaming + contexte + gate flag.
- **Lot 3 (tours)** — lib de tour + config déclarative des premiers tours (missions, cadrage…), `suggest_tour`, déclenchement 1ʳᵉ visite.
- **Lot 4 (test snayz → prod)** — flags OFF par défaut, test bout-en-bout sur snayz, PR staging→main, activation prod par flag (après validation DPA/ZDR).
- **Option** — brancher les questions sans réponse sur la boucle RFC 0010 (amélioration continue du contenu d'aide).

## 11. Sécurité — synthèse (règle « analyse d'impact avant modif »)

| Risque | Mitigation |
|---|---|
| Fuite de contenu staff au client | `search_help` filtré par `HelpAudience` selon le rôle du caller ; v1 staff-only |
| Clé API exposée | `ANTHROPIC_API_KEY` serveur-only (Edge Function), jamais front |
| Injection via question/article | Texte = donnée ; system prompt de fencing ; aucun outil mutatif |
| Endpoint anonyme | `authenticateCaller` obligatoire (Bearer vérifié) même en streaming |
| Rétention Anthropic | Messages API en mode ZDR / no-training (décision B RFC 0010) |
| Coût / abus | Modèle léger + plafond $/conversation + `ai_calls_log` |
| PII métier | Data-minimization : rôle + route + question uniquement |
| RLS conversations (si B) | `get_my_user_id()` SECURITY DEFINER, pas de récursion, écriture service_role |

## 12. Rollback

- Migration 00258 réversible par son `_down` (drop flag + tables).
- Edge Function additive (aucune modification d'un edge existant) → suppression sans effet de bord.
- Front réversible par revert ; le flag OFF neutralise entièrement le widget sans déploiement.
