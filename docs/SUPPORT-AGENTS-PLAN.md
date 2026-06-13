# Plan d'implémentation — Support & Agents

> Module « Centre d'aide » (3 actions : bug / demande / suggestion) + agents associés.
> Maquette de référence : `prototype/support-triage/mockup.html`.
> Prototype moteur (triage) : `prototype/support-triage/triage.ts`.
> Sous-agents dev déjà présents : `.claude/agents/{security-auditor,code-reviewer,bug-reproducer}.md`.
>
> Statut : **proposition — à valider avant tout code.**

---

## 0. Principe directeur : 2 familles d'agents, 2 surfaces

| Famille | Sujet d'analyse | S'exécute dans | Concerne ici |
|---|---|---|---|
| **Data-facing** | la base Supabase | une **Edge Function** (Deno + API Anthropic) | triage des **bugs** |
| **Code-facing** | le **repo** | un **runner avec le code** (GitHub Actions) | **faisabilité** des suggestions |

Cette frontière conditionne tout le découpage : on ne fait jamais analyser du code par une Edge Function, ni interroger la prod par un job CI.

---

## 1. Assets déjà en place (réduisent l'effort)

- Appels Anthropic server-side : `smart-*`, `ai-documents`, `admin-framework-ai-draft` + helper `_shared/log-ai-call.ts` (coût/tokens).
- Clé lue côté serveur : `Deno.env.get('ANTHROPIC_API_KEY')`.
- Monitoring usage IA dans la superadmin (`useAdminMonitoring` : tokens, coût, échecs).
- Backends de « demande » : `reset-user-password` (`can_manage_members`), `feature_flags` / `plan_features` / `feature_flag_overrides`, `manage-team`, `invite-client`, `plans`.
- `is_platform_owner` (mig. 00067), `admin_audit_log` (00068), `notifications`.
- Helpers RLS `SECURITY DEFINER` : `get_my_user_id()`, `get_my_organization_id()`, `get_my_mission_ids()`.

## À construire (confirmé absent)

- Table support, bucket pièces jointes, entrée « Aide » (auditeur + portail), `ErrorBoundary` + buffer d'erreurs global, exposition du build SHA.

---

## 2. Découpage en phases (valeur d'abord, risque IA en dernier)

### Phase 0 — Fondations (prérequis transverses) · taille **M**
- **Migration** `NNNNN_support_requests_up/down.sql` :
  - `support_requests(id, nature ['bug'|'demande'|'suggestion'], subtype, status, title, body, requester_user_id, cabinet_id, mission_id?, role_at_submit, context jsonb, attachments jsonb, created_at, updated_at)`.
  - **RLS** : lecture/écriture par le cabinet du demandeur (`cabinet_id = get_my_organization_id()` ou via `get_my_mission_ids()` pour les clients), tout pour `is_platform_owner` — **via fonctions SECURITY DEFINER, aucune sous-requête sur la table elle-même** (pas de récursion).
- **Bucket** privé `support-attachments` + policies RLS (captures d'écran = données potentiellement sensibles).
- **Frontend transverse** :
  - `ErrorBoundary` global + **buffer d'erreurs** (ring buffer des N dernières erreurs console + requêtes 4xx/5xx), **filtrant `Authorization`/tokens** avant stockage.
  - Build SHA exposé via `vite define` (déjà committé : ex. `247ab29`).
  - Entrée « Centre d'aide » dans la nav auditeur ET portail client.
  - Écran d'entrée à **3 cartes** (bug / demande / suggestion).
- **Sortie** : socle prêt, rien d'« intelligent » encore.

### Phase 1 — Demandes (routage, sans IA) · taille **M** · *recommandé en 1er*
- Formulaires par type, **liste filtrée par rôle** (options centralisées dans `src/lib/constants.ts`).
- **Moteur de routage** :
  | Type | Traitement | Cible |
  |---|---|---|
  | Réinit. mot de passe | appel `reset-user-password` | auto (admin cabinet) |
  | Activation fonctionnalité | si `plan_features` couvre → toggle cabinet ; sinon → demande | cabinet OU platform owner |
  | Changement de plan | crée une demande + notification | platform owner |
  | Accès / membre | `manage-team` / `invite-client` | admin cabinet |
- Suivi du statut dans `support_requests` + `notifications`.
- Superadmin : file + traitement des demandes.
- **Aucune IA, aucun risque RGPD nouveau.** Livre de la valeur immédiatement.

### Phase 2 — Bug : intake + reproduction assistée (sans agent) · taille **L**
- **Enregistreur d'actions** (pièce la plus délicate) : capte clics, changements de route, erreurs réseau ; produit une trace ; **filtre les secrets**.
- Formulaire bug + **récap de trace éditable** (retrait d'étape, commentaire) → stocké dans `support_requests.context`.
- Superadmin : détail bug avec la trace.
- **Sans agent** : les humains trient déjà avec une trace précise → gros gain seul.

### Phase 3 — Agent de triage bug (data-facing) · taille **M** · *dépend d'un feu vert DPA*
- Edge Function `run-agent` = industrialisation de `prototype/support-triage/triage.ts` : boucle tool-use Anthropic, **outils DB en lecture seule et scopés** (jamais de SQL libre), lit le ticket + la trace.
- Tables `agent_runs` / `agent_run_steps`, gate `is_platform_owner`, secret `ANTHROPIC_API_KEY`, coût via `log-ai-call.ts`.
- Superadmin : bouton « Lancer le triage » + **brouillon de réponse (co-pilote)** ; l'humain valide.

### Phase 4 — Agent de faisabilité suggestions (code-facing) · taille **L** · *le plus lourd*
- Workflow **GitHub Actions** (`workflow_dispatch`) : checkout repo → Claude (sous-agent `suggestion-analyst`, cousin de `impact-analyst`) → rapport **RICE** structuré (verdicts par dimension, conformité/RGPD, hypothèses, effort+confiance).
- **Write-back authentifié** : le workflow réécrit le rapport sur `support_requests` (via une Edge Function dédiée protégée par un secret CI, OU artefact + import manuel — à trancher).
- Superadmin : bouton « Analyser la faisabilité » → dispatch → affichage du rapport.
- Crée `.claude/agents/suggestion-analyst.md`.

---

## 3. Sécurité & conformité (transverse — bloquant pour 3 & 4)

1. **RLS** sur `support_requests`, `agent_runs`, bucket : cloisonnement cabinet via `SECURITY DEFINER`, **jamais** de self-référence (anti-récursion).
2. **Agents service_role** : outils **lecture seule**, requêtes pré-définies, **pas de SQL généré par le LLM** (sinon exfiltration cross-cabinet).
3. **Secrets** : `ANTHROPIC_API_KEY` côté Edge + secret CI ; **jamais** côté client.
4. **RGPD / DPA** : des données tenant partent vers Anthropic (Phases 3-4). À **cadrer juridiquement avant prod** : base légale, minimisation, anonymisation si possible, zone de données. **Potentiel bloquant.**
5. **Buffer d'erreurs** : strip `Authorization`/tokens/cookies avant stockage.
6. **Prompt injection** : les données tenant peuvent contenir des instructions piégées → agents **sans outil à effet de bord** (lecture seule).
7. **Coût/abus** : plafond de tokens par run, rate-limit, budget — branchés sur le monitoring existant.
8. **Journalisation** : chaque run/demande dans `admin_audit_log`.

---

## 4. Décisions à trancher avant de coder

- **Schéma** : ✅ **tranché** — STI hybride (table unique `support_requests` : colonnes typées pour le commun + `payload`/`context` JSONB pour le variable + table enfant `agent_runs`). Voir Annexe A.
- **DPA Anthropic** : le flux données tenant → Anthropic est-il contractuellement couvert ? (conditionne Phases 3-4 en prod)
- **Canal du « support platform owner »** : notification in-app, email (Resend déjà validé pour gestugroup.com), ou les deux ?
- **Enregistreur d'actions** : périmètre des événements captés + durée de rétention de la trace.
- **Write-back GitHub Actions → Supabase** : Edge Function dédiée (secret CI) vs artefact + import.

---

## 5. Séquencement recommandé

**Phase 0 → Phase 1 → Phase 2** d'abord : elles livrent un Centre d'aide complet et utile **sans aucun risque IA ni dépendance DPA**. **Phases 3 et 4** ensuite, une fois le feu vert DPA obtenu et les fondations éprouvées. Chaque phase est livrable et testable indépendamment (compte non-admin pour la RLS).

---

## Annexe A — Spéc détaillée Phase 0 (fondations)

> Analyse d'impact à valider **avant** d'écrire le code.

### A.1 Migration `NNNNN_support_requests_up/down.sql`

```sql
create type support_nature as enum ('bug','demande','suggestion');
create type support_status as enum ('open','in_progress','answered','escalated','resolved','closed');

create table public.support_requests (
  id                uuid primary key default gen_random_uuid(),
  nature            support_nature not null,
  subtype           text,                 -- 'password_reset','feature_activation'… (null pour bug/suggestion)
  status            support_status not null default 'open',
  title             text not null,
  body              text,
  requester_user_id uuid not null references public.users(id),
  cabinet_id        uuid not null references public.organizations(id),  -- colonne RÉELLE pour la RLS
  mission_id        uuid references public.missions(id),
  role_at_submit    text,                 -- 'client'|'auditor'|'admin'
  context           jsonb not null default '{}'::jsonb,  -- trace repro / contexte auto-capté / params
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index support_requests_cabinet_status_idx on public.support_requests (cabinet_id, status);
create index support_requests_nature_idx on public.support_requests (nature);

-- Table enfant : runs d'agent (Phases 3-4) — créée dès maintenant ou plus tard
create table public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.support_requests(id) on delete cascade,
  kind          text not null,            -- 'triage' | 'feasibility'
  status        text not null default 'queued',
  result        jsonb,
  input_tokens  int, output_tokens int, cost_usd numeric,
  created_at    timestamptz not null default now()
);
```
`down.sql` : `drop table agent_runs; drop table support_requests; drop type support_status; drop type support_nature;`

### A.2 RLS (SECURITY DEFINER, sans récursion)

```sql
alter table public.support_requests enable row level security;

-- helper si absent (wrappe la colonne is_platform_owner)
create or replace function public.is_platform_owner() returns boolean
  language sql security definer set search_path = public stable as $$
  select coalesce((select is_platform_owner from public.users where id = get_my_user_id()), false) $$;

create policy sr_select on public.support_requests for select using (
  public.is_platform_owner()
  or cabinet_id = public.get_my_organization_id()
  or mission_id = any (public.get_my_mission_ids())
);
create policy sr_insert on public.support_requests for insert with check (
  requester_user_id = public.get_my_user_id()
  and (cabinet_id = public.get_my_organization_id() or mission_id = any (public.get_my_mission_ids()))
);
create policy sr_update on public.support_requests for update using (
  public.is_platform_owner() or requester_user_id = public.get_my_user_id()
);
```
⚠️ Aucune sous-requête sur `support_requests` elle-même → pas de récursion. À tester avec un compte non-admin.

### A.3 Bucket pièces jointes
- Bucket **privé** `support-attachments`, policies : insert/select limités au demandeur + platform owner. URLs signées éphémères (pas de `getPublicUrl`).

### A.4 Frontend
- `ErrorBoundary` global autour de `<App/>` (capture les erreurs de rendu).
- **Buffer d'erreurs** (`src/lib/errorBuffer.ts`) : ring buffer des 20 dernières entrées via `window.onerror`, `unhandledrejection`, et un wrap léger autour des appels réseau. **Strip** `Authorization`/`apikey`/tokens/cookies avant stockage.
- Build SHA : `vite define` → `__BUILD_SHA__` (git rev-parse court).
- Entrée « Centre d'aide » dans la nav **auditeur** ET **portail client**.
- Route + écran d'entrée à **3 cartes** (réutilise la maquette).

### A.5 Sécurité Phase 0 (checklist)
RLS testée non-admin · buffer strip secrets · bucket privé · aucune récursion de policy · pas de secret côté client · entités HTML FR dans le JSX · composants ≤ 150 lignes.

### A.6 Effort
Taille **M** (~3-5 j-h). Pré-requis d'aucune autre phase ; débloque 1 et 2.
