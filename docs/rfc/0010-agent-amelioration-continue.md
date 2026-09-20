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

### Phase 5a — Analyse d'impact spécialisée (map-reduce, lecture seule)

Plutôt qu'un unique `impact-analyst` généraliste (contexte dilué, moyen partout), l'analyse d'impact est **décomposée en agents spécialisés** orchestrés en **map-reduce**, tous code-facing et lecture seule. Objectif : précision (prompt/outils/critères dédiés par axe) **et** efficacité (parallélisme + fan-out conditionnel + modèle par tâche).

**① Cartographe d'impact** (map, Haiku) — tourne en premier. Trace fichiers/modules/composants/hooks touchés + appelants, et **classe les couches impactées** (base / edge / frontend / RGPD). Son verdict **déclenche conditionnellement** la suite.

Puis, **en parallèle et uniquement pour les couches signalées** :

- **② Données & RLS / migrations** *(nouveau, spécialité n°1 ici)* — tables/colonnes, migration `up`+`down` (n° suivant = **00256**), **impact RLS & isolation multi-tenant** (pas de récursion, helpers `SECURITY DEFINER`), maintien manuel de `database.types.ts`, déclenchement du gate deploy.
- **③ Sécurité serveur & edges** — **réutilise l'agent `security-auditor`** : IDOR, `service_role`, auth des edges, secrets, messages d'erreur.
- **④ Frontend & charte** — **réutilise l'agent `code-reviewer`** : composants > 150 lignes, patterns, BRAND.md, entités JSX (`check:entities`), selects centralisés, cleanup async.
- **⑤ Qualité & plan de test** *(nouveau)* — golden path + cas limites + **test compte non-admin (RLS)**, surface de régression.

**⑥ Synthétiseur d'impact** (reduce, Opus) — fusionne les rapports en **un seul** livrable (rayon d'action · migrations/RLS · backend · sécurité · UX · plan de test · **découpage en lots** · verdict + risques classés), réconcilie/dédoublonne, et lance une **vérification adverse** ciblée sur tout constat « bloquant » sécurité/RLS.

Architecture retenue : **5 spécialistes + synthèse**, **fan-out conditionnel** via le cartographe (un lot purement frontend ne réveille ni Données/RLS ni forcément Sécurité serveur). On ne crée que 3 agents (cartographe, données/RLS, tests) + le synthétiseur ; ③ et ④ réutilisent l'existant.

Côté exécution : le workflow `impact.yml` orchestre le fan-out via des **sous-agents** (comme des subagents Claude Code) à l'intérieur d'un seul job ; il réutilise **tel quel** le pattern existant (read-only, `fetch` de la suggestion, `writeback` du rapport synthétisé). **Aucun risque d'écriture.** Une seule ligne `agent_runs` (`kind='impact'`) porte le rapport final ; le détail par spécialiste (constats, tokens/coût) est stocké dans `result.specialists[]`. Ce livrable remplace l'analyse d'impact qu'on écrit à la main aujourd'hui.

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
- **`impact.yml`** (CI, `permissions: contents: read`) : calqué sur `feasibility.yml` ; **orchestre le map-reduce** (cartographe → spécialistes conditionnels en parallèle → synthétiseur) via des sous-agents ; `writeback` du rapport synthétisé (détail par spécialiste dans `result.specialists[]`).
- **`dispatch-draft-pr`** (edge, owner + flag `support_agent_draft_pr`) : insère `agent_runs {kind:'draft_pr', parent_run_id}`, déclenche `.github/workflows/draft-pr.yml`.
- **`draft-pr.yml`** (CI, `permissions: contents: write, pull-requests: write`) : **le seul** workflow à écriture ; branche depuis `staging`, agent de code, gates, ouvre la PR, appelle `record_pr`.
- **`feasibility-callback`** : ajouter l'action **`record_pr { run_id, pr_url, pr_branch, pr_state }`** (garde `.eq('kind','draft_pr')` + `.eq('status','running')`). Optionnellement renommer en `agent-callback` (compat conservée).

## 7. Garde-fous & sécurité

Le chemin d'écriture (5b) est le point sensible ; il est clôturé ainsi :

- **Cible `staging` uniquement** — le workflow refuse tout `base` ≠ `staging` ; `main` hors d'atteinte de l'agent (le gate prod reste 100 % humain).
- **Token à portée minimale — GitHub App dédiée (acté, déc. A)** — une App « Gëstu Agents » installée sur **ce seul repo**, permissions `contents:write` + `pull_requests:write` (+ `actions:write` pour les `workflow_dispatch`). Le workflow **frappe un token court à l'exécution** via `actions/create-github-app-token` (secrets = `APP_ID` + `APP_PRIVATE_KEY` uniquement, aucun token longue durée au repos). Elle **remplace** le PAT `GITHUB_DISPATCH_TOKEN`. Révocation en un point (désinstaller l'App). La restriction « jamais `main` » n'est pas portée par le token (les Apps ne restreignent pas la branche) mais par la **branch protection sur `main`** (gate prod) + le workflow qui ne cible que `staging` (défense en profondeur).
- **Périmètre borné (acté, déc. C — multi-facteur)** — brouillon auto seulement si **tous** réunis : verdict **`go`** · `effort_estimate ∈ {S, M}` · **aucune couche à fort enjeu touchée** (migration / RLS / edge / auth) → v1 = frontend-only / additif non-schéma · **aucun constat bloquant** (sécurité/RLS). Sinon l'agent produit l'analyse d'impact (5a) et **s'arrête** (brouillon manuel). Double garde : bouton UI désactivé + revérification côté `dispatch-draft-pr` (défense en profondeur).
- **Double flag + DPA (acté, déc. B)** — 5a et 5b OFF par défaut ; activation prod conditionnée à DPA signée + Anthropic sous-traitant ultérieur inscrit + **ZDR/no-training exigé** (le brouillon 5b embarque plus de contexte code que le `body`+`module` minimal, à re-scoper).
- **Hygiène d'entrée (acté, déc. B)** — le champ suggestion avertit « pas de PII ni de secret » ; scan de secrets sur le contexte code envoyé ; le `body` reste minimisé (`body`+`module`, jamais identité cabinet/mission).
- **Triple validation humaine** — déclenchement owner, revue de la PR, gate prod.
- **Traçabilité** — `agent_runs` (tokens/coût) + `ai_calls_log` + **`admin_audit_log`** pour toute action d'écriture (création de branche/PR).
- **Budget & modèles (acté, déc. D)** — tiering Haiku (①④⑤) / Sonnet (②③) / Opus (⑥) ; coupes dures **3 $** (impact) et **5 $** (brouillon) → run `error` au-delà ; tours bornés par spécialiste ; coût réel via PRICING (voir §9.5).
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

1. **DPA / RGPD** : ~~à trancher~~ → **TRANCHÉ CONDITIONNEL (2026-09-20, déc. B)**. Principe : **découpler build et activation**. On construit 5a/5b derrière flags **OFF** (dev/staging = suggestions de test, aucune donnée client réelle). L'**activation prod** est conditionnée à **tous** les points suivants : (a) **DPA Anthropic signée** couvrant l'usage API/Claude Code — *statut actuel : à vérifier* ; (b) **Anthropic inscrit comme sous-traitant ultérieur** dans le registre + les DPA clients ; (c) **ZDR / no-training exigé** (zéro-rétention, pas d'entraînement sur les données envoyées) ; (d) **garde-fou d'entrée** en place (voir §7). Rappel du périmètre envoyé (code-facing) : **code du repo + `body`/`module`**, jamais de données prod/client.
2. **Périmètre auto** : ~~plafond d'effort~~ → **ACTÉ (2026-09-20, déc. C)** : critère **multi-facteur** — `go` + effort S/M + **aucune couche à fort enjeu** (migration/RLS/edge/auth, donc v1 frontend-only/additif) + aucun bloquant. Motif : le risque vient de *ce que ça touche*, pas de la taille. Voir §7 (double garde UI + edge).
3. **Token** : ~~GitHub App dédiée vs PAT fine-grained~~ → **ACTÉ (2026-09-20)** : GitHub App unique « Gëstu Agents », périmètre minimal, token court minté par run, remplace le PAT. Motif : durée courte, révocable en un point, non liée à une personne, auditable. Voir §7.
4. **Callback** : étendre `feasibility-callback` (rapide) vs nouveau `agent-callback` (plus propre).
5. **Modèle & budget** : ~~à préciser~~ → **ACTÉ (2026-09-20, déc. D)**. Tiering par tâche : **Haiku** pour ① Cartographe, ④ Frontend&charte, ⑤ Tests ; **Sonnet** pour ② Données&RLS, ③ Sécurité serveur ; **Opus** pour ⑥ Synthétiseur (arbitrage + vérif adverse). Versions pinnées en un seul endroit (aligner l'edge `run-agent` de `sonnet-4-6` sur Sonnet 5 / Haiku 4.5). **Coupes dures** : run d'impact (5a) **3 $**, run de brouillon (5b) **5 $** → au-delà, run marqué `error` (pas de rapport partiel trompeur) ; tours bornés par spécialiste (motif `MAX_TURNS`). PRICING : ajouter `claude-code-impact`/`claude-code-draft-pr` et corriger `claude-code-feasibility` (aujourd'hui prix de repli). *Suivi (hors D)* : plafond mensuel global qui bascule le flag OFF si dépassé.

## 10. Plan de livraison (incrémental)

- **Lot 1 (5a)** — analyse d'impact spécialisée : agents `impact-cartographe`, `impact-data-rls`, `impact-tests` + `impact-synthetiseur` (réutilise `security-auditor` et `code-reviewer`), prompts associés, `impact.yml` (read-only, orchestre le fan-out conditionnel) + `dispatch-impact` + `writeback` + `ImpactReport.tsx` + flag `support_agent_impact` (mig 00256 partielle). **Faible risque** (lecture seule).
- **Lot 2 (5b backend)** — `draft-pr.yml` (write, staging-only) + `dispatch-draft-pr` + `record_pr` + colonnes PR + flag `support_agent_draft_pr` + token dédié. Testé sur snayz, flag OFF.
- **Lot 3 (5b UX + activation)** — bouton owner + suivi PR + `admin_audit_log` + PRICING + DPA → activation.

## 11. Hors périmètre

- IA côté auditeur (SmartScope/SmartPlan) — indépendant.
- Merge automatique vers `main` — **jamais** (gate prod humain).
- SQL généré par LLM — interdit (requêtes pré-définies uniquement, doc §3.2).
- Les autres pistes agentiques (assistant super-admin, supervision/santé, auto-audit sécurité, onboarding multi-tenant) — RFCs distincts.
