# RFC 0010 — Boucle d'amélioration continue par agents IA

- **Statut** : proposition (à trancher)
- **Date** : 2026-09-20
- **Périmètre** : administration & amélioration continue de la plateforme (interne), pas l'IA côté auditeur (SmartScope/SmartPlan)
- **Prérequis** : Phases 0→4 du module « Support & Agents » (voir `docs/SUPPORT-AGENTS-PLAN.md`)

---

## 1. Contexte & objectif

La plateforme sait déjà transformer une **suggestion** d'utilisateur en **rapport de faisabilité RICE** produit par un agent qui lit le vrai code (Phase 4, code-facing). Ce RFC propose l'étape suivante : fermer la boucle d'amélioration continue en allant de la faisabilité jusqu'à un **brouillon de Pull Request sur `staging`**, prêt à revue — sans jamais toucher la prod automatiquement.

En clair, on industrialise **exactement le flux qu'on a exécuté à la main** pour la refonte UX (RFC-less, 7 lots) : idée → RICE → analyse d'impact (avec section sécurité) → branche feat → gates → PR `staging`. L'humain garde deux points de contrôle : il **déclenche** le brouillon, il **revoit/merge** la PR, et la prod reste derrière le **gate d'approbation** existant.

## 2. Existant (à ne pas réinventer)

Déjà livré (réf. `docs/SUPPORT-AGENTS-PLAN.md`) :

- **`support_requests`** (mig `00129`) — stocke les suggestions (`nature='suggestion'`, `body`, `context.module`), RLS cabinet/mission via helpers SECURITY DEFINER.
- **`agent_runs`** (mig `00131`) — 1 ligne par exécution d'agent : `kind` (`'triage'|'feasibility'`), `status` (`queued|running|done|error`), `result jsonb`, tokens + `cost_usd`, RLS **platform-owner only**.
- **Flags kill-switch** : `support_agent_triage` (`00131`), `support_agent_feasibility` (`00132`), OFF par défaut (garde-fou DPA).
- **Edges** : `dispatch-feasibility` (UI-facing, owner + flag, insère le run puis déclenche GitHub avec **seulement `run_id`**), `feasibility-callback` (CI-facing, secret `x-callback-secret` en comparaison constant-time, actions `fetch`/`writeback`, anti-rejeu via `.eq('status','running')`).
- **CI** : `.github/workflows/feasibility.yml` (`permissions: contents: read`, agent limité à `Read,Grep,Glob,Bash`, prompt `.github/feasibility-prompt.md`, validation `jq` du schéma, `writeback`).
- **UI** : `src/features/support/{SuggestionForm,SupportFeasibilityPanel,FeasibilityReport}.tsx`, `src/pages/admin/AdminSupportPage.tsx` (queue owner-only).
- **Principe directeur** (doc §0) : **deux familles / deux surfaces** — *data-facing* (analyse la base, tourne en Edge Function) vs *code-facing* (analyse le repo, tourne en GitHub Actions). « On ne fait jamais analyser du code par une Edge Function, ni interroger la prod par un job CI. »

La roadmap documentée s'arrête à la Phase 4. Ce RFC définit la **Phase 5**.

## 3. Principes directeurs (repris et étendus)

1. **La valeur d'abord, le risque IA en dernier** — on livre l'analyse d'impact (lecture seule) avant le chemin d'écriture.
2. **Humain dans la boucle, toujours** — l'agent *propose*, l'admin/le gate *dispose*. Aucune écriture prod automatique.
3. **Deux familles maintenues** — l'analyse d'impact et le brouillon de PR sont **code-facing** → GitHub Actions, jamais une Edge Function.
4. **Moindre privilège** — token GitHub à portée minimale, cible **`staging` uniquement**, jamais `main`.
5. **Traçabilité totale** — chaque exécution dans `agent_runs` + `ai_calls_log` + `admin_audit_log`.
6. **Le texte est une donnée, pas une instruction** — défense anti-injection reprise du prompt de faisabilité.

## 4. Proposition — Phase 5 : « idée → RICE → impact → brouillon de PR »

Deux sous-phases, séquencées par risque.

### Phase 5a — Agent d'analyse d'impact (`impact-analyst`, lecture seule)

Un second passage code-facing, **plus profond que le RICE**, déclenché après un rapport de faisabilité `go`/`a_etudier` :

- **Rayon d'action** : fichiers/modules touchés, composants et hooks impactés.
- **Impact base** : migrations nécessaires (n° suivant = **00256**), tables/colonnes, **impact RLS** et cloisonnement multi-tenant.
- **Impact backend** : edges à créer/modifier, déclenchement du gate prod (mig/functions).
- **Plan de test** : golden path + cas limites + compte non-admin (RLS).
- **Découpage proposé** : incréments livrables (comme nos « lots »).
- **Section sécurité** obligatoire (cohérent avec `feedback_impact_analysis`).

Réutilise **tel quel** le pattern existant : workflow read-only, `fetch` de la suggestion, `writeback` du rapport. **Aucun nouveau risque d'écriture.** C'est le livrable qui remplace l'analyse d'impact qu'on écrit à la main aujourd'hui.

### Phase 5b — Agent de brouillon de PR (`draft-pr`, chemin d'écriture, sur-gardé)

Sur action explicite de l'owner (après lecture du RICE + impact), un workflow **distinct et à écriture** :

1. crée une branche `feat/agent-<run_id>` **depuis `staging`** ;
2. laisse un agent de code implémenter le changement **borné** (voir garde-fous) ;
3. exécute les gates (`typecheck`, `build`, `check:entities`) ;
4. ouvre une **PR vers `staging`** (jamais `main`) ;
5. renvoie l'URL/branche/état via un nouvel `record_pr` du callback.

La PR suit ensuite le flux normal : revue humaine → merge `staging` → **gate prod** existant. **Trois barrières humaines** au total (déclenchement, revue de PR, gate prod).

## 5. Modèle de données (extensions)

Migration **00256** (extensions additives, pas de rupture) :

- `agent_runs.kind` : ajouter les valeurs d'usage `'impact'`, `'draft_pr'` (colonne `text` libre — pas de contrainte à modifier, seule la doc/typage évolue).
- `agent_runs` : nouvelles colonnes nullables `pr_url text`, `pr_branch text`, `pr_state text` (`drafted|open|merged|closed|error`), `parent_run_id uuid references agent_runs(id)` (chaîne faisabilité → impact → draft_pr).
- **Flags** : `support_agent_impact` (5a) et `support_agent_draft_pr` (5b), `is_globally_enabled=false` par défaut (kill-switch DPA).
- RLS inchangée (`agent_runs` reste owner-only ; écritures via service_role).
- `_shared/log-ai-call.ts` : ajouter `'claude-code-impact'` et `'claude-code-draft-pr'` à la table `PRICING` (aujourd'hui `'claude-code-feasibility'` tombe sur `FALLBACK_PRICE`).

## 6. Edges & workflows

- **`dispatch-impact`** (edge, owner + flag `support_agent_impact`) : insère `agent_runs {kind:'impact', parent_run_id}`, déclenche `.github/workflows/impact.yml` avec `run_id`. Calqué sur `dispatch-feasibility`.
- **`impact.yml`** (CI, `permissions: contents: read`) : identique à `feasibility.yml`, prompt `.github/impact-prompt.md`, agent `impact-analyst` (lecture seule), `writeback` du rapport d'impact.
- **`dispatch-draft-pr`** (edge, owner + flag `support_agent_draft_pr`) : insère `agent_runs {kind:'draft_pr', parent_run_id}`, déclenche `.github/workflows/draft-pr.yml`.
- **`draft-pr.yml`** (CI, `permissions: contents: write, pull-requests: write`) : **le seul** workflow à écriture ; branche depuis `staging`, agent de code, gates, ouvre la PR, appelle `record_pr`.
- **`feasibility-callback`** : ajouter l'action **`record_pr { run_id, pr_url, pr_branch, pr_state }`** (garde `.eq('kind','draft_pr')` + `.eq('status','running')`). Optionnellement renommer en `agent-callback` (compat conservée).

## 7. Garde-fous & sécurité

Le chemin d'écriture (5b) est le point sensible ; il est clôturé ainsi :

- **Cible `staging` uniquement** — le workflow refuse tout `base` ≠ `staging` ; `main` hors d'atteinte de l'agent (le gate prod reste 100 % humain).
- **Token à portée minimale** — GitHub App / PAT fine-grained, `contents:write` + `pull_requests:write` sur **ce seul repo**, distinct du `GITHUB_DISPATCH_TOKEN` de lecture.
- **Périmètre borné** — brouillon autorisé seulement si faisabilité `go`/`a_etudier` **et** `effort_estimate ∈ {S, M}` ; au-delà (L/XL) → pas de brouillon auto (reste manuel).
- **Double flag + DPA** — 5a et 5b OFF par défaut ; activation après validation DPA (le brouillon embarque plus de contexte code que le `body`+`module` minimal, à re-scoper).
- **Triple validation humaine** — déclenchement owner, revue de la PR, gate prod.
- **Traçabilité** — `agent_runs` (tokens/coût) + `ai_calls_log` + **`admin_audit_log`** pour toute action d'écriture (création de branche/PR).
- **Anti-injection** — le `body` reste « donnée à analyser » ; l'agent de code ne suit pas d'instructions issues de la suggestion.
- **Gates durs** — la PR ne s'ouvre que si `typecheck` + `build` + `check:entities` passent dans le workflow.
- **Anti-rejeu** — `record_pr` borné à `kind='draft_pr'` + `status='running'`, comme `writeback`.

## 8. UX (owner-only)

Extension de `SupportFeasibilityPanel` :

- après un rapport de faisabilité `go`/`a_etudier` : bouton **« Analyser l'impact »** → rend le rapport d'impact (nouveau `ImpactReport.tsx`) ;
- après l'impact (si flag 5b + effort ≤ M) : bouton **« Générer un brouillon de PR »** (confirmation) → lance `dispatch-draft-pr` ;
- affichage de l'état du brouillon + **lien vers la PR** `staging` dès `record_pr`.

Chaîne visible : suggestion → RICE → impact → PR, via `parent_run_id`.

## 9. Décisions à trancher

1. **DPA** : couverture Anthropic pour un agent qui lit le repo en profondeur et rédige du code (5b) — bloquant pour la prod.
2. **Périmètre auto** : plafond d'effort pour le brouillon auto (proposé : S/M) et modules éligibles (proposé : exclure migrations/RLS lourdes en 5b v1).
3. **Token** : GitHub App dédiée vs PAT fine-grained.
4. **Callback** : étendre `feasibility-callback` (rapide) vs nouveau `agent-callback` (plus propre).
5. **Modèle** : `claude-code` (Sonnet) pour 5a/5b, budget par run.

## 10. Plan de livraison (incrémental)

- **Lot 1 (5a)** — `impact-analyst` + `impact-prompt.md` + `impact.yml` (read-only) + `dispatch-impact` + `record impact` (writeback) + `ImpactReport.tsx` + flag `support_agent_impact` (mig 00256 partielle). **Faible risque** (lecture seule).
- **Lot 2 (5b backend)** — `draft-pr.yml` (write, staging-only) + `dispatch-draft-pr` + `record_pr` + colonnes PR + flag `support_agent_draft_pr` + token dédié. Testé sur snayz, flag OFF.
- **Lot 3 (5b UX + activation)** — bouton owner + suivi PR + `admin_audit_log` + PRICING + DPA → activation.

## 11. Hors périmètre

- IA côté auditeur (SmartScope/SmartPlan) — indépendant.
- Merge automatique vers `main` — **jamais** (gate prod humain).
- SQL généré par LLM — interdit (requêtes pré-définies uniquement, doc §3.2).
- Les autres pistes agentiques (assistant super-admin, supervision/santé, auto-audit sécurité, onboarding multi-tenant) — RFCs distincts.
