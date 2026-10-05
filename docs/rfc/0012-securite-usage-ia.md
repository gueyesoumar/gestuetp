# RFC 0012 — Sécurité de l'usage de l'IA : gouvernance de l'exposition des données

- **Statut** : décisions actées (2026-10-02) — prêt pour le P2
- **Date** : 2026-10-01 (décisions actées le 2026-10-02)
- **Périmètre** : tous les flux IA *data-facing* (côté auditeur/client) qui envoient du contenu ou des données clients à un modèle externe — `ai-documents`, `smart-analyse`, `smart-risks`, `smart-plan`, `smart-questionnaire`, `suggest-custom-questions`, `extract-document-metadata`, `extract-org-chart-actors`. **Hors périmètre** : les agents *code-facing* internes (RFC 0010) qui n'envoient pas de données clients.
- **Prérequis** : P0 (kill-switch appliqué partout) et P1 (détection déterministe + score d'exposition, observe-only) **déjà livrés** — cette RFC acte l'architecture cible et tranche les décisions avant P2/P3.

---

## 1. Contexte & objectif

Gëstu manipule des documents clients sensibles (preuves d'audit, politiques, pièces financières). Aujourd'hui, **le contenu brut de ces documents part vers Anthropic par défaut** : à l'upload (`registerDocumentForAI.ts` → `ai-documents` → Files API) et via URL signée transmise au modèle (`smart-analyse`). Partent aussi l'identité client, les réponses de questionnaire *verbatim* et les observations d'auditeur.

Objectif : **empêcher qu'un document ou une donnée sensible soit envoyé à une IA publique sans accord du client**, et **rendre visible** à l'auditeur et au RSSI ce que l'IA a le droit de voir — sans casser la valeur des fonctions IA existantes.

L'approche retenue (étude 2026-10-01) n'est **pas** un choix entre trois solutions concurrentes, mais **trois couches d'un même pipeline** posé devant chaque appel IA : (1) détection déterministe, (2) classifieur local, (3) score d'exposition + décision de politique.

## 2. Existant (à ne pas réinventer)

Déjà livré :

- **Kill-switch cabinet** `organizations.ai_analysis_enabled` (mig `00088`), **désormais appliqué par TOUTES les fonctions exposantes** via le garde partagé `supabase/functions/_shared/ai-guard.ts` (`isAiEnabled`) — **P0**. Court-circuit gracieux `{ skipped_reason: 'cabinet_ai_disabled' }` + toast UI « IA désactivée ». Le texte de réglage ne ment plus.
- **Détection déterministe** `supabase/functions/_shared/pii-detect.ts` : email, téléphone +221, IBAN (mod-97), carte (Luhn), IP, clés API, secrets, NINEA / CNI-NIN. **Positions + catégories only, aucune valeur stockée** — **P1**.
- **Score d'exposition** `supabase/functions/_shared/exposure-score.ts` : `{ score, level, counts, pct_flagged }`. Câblé à l'upload (DOCX/XLSX) et aux flux `smart-*` (contexte textuel), **observe-only** — **P1**.
- **Persistance** : `documents.ai_sensitivity`/counts (mig `00261`) + `ai_calls_log.exposure_*`. Badge `SensitivityBadge` sur les documents.
- **Garde-fous transverses** : `authenticateCaller` + cloisonnement cabinet (`sameCabinet`), flags DPA par agent (OFF par défaut), `verify_jwt`, journalisation `ai_calls_log`, **piste d'audit probante** (F6 — `activity_log`, chaîne de hash par org), buckets sensibles privés (URLs signées courtes).

## 3. Principes directeurs

1. **Un seul point d'étranglement** — toute sortie vers un modèle externe passe par `ai-guard`. Aucun `fetch` Anthropic « nu » dans une fonction.
2. **Le client est propriétaire de ses données** — le consentement se décide au niveau du **client**, pas seulement du cabinet.
3. **Minimiser avant d'envoyer** — on **caviarde** ce qui peut l'être ; le score ne sert pas qu'à constater, il sert à **réduire** (`pct_flagged` doit pouvoir baisser).
4. **Honnêteté du score** — destination et rétention affichées **reflètent la réalité** (Anthropic, rétention par défaut) tant que le ZDR / le tenant privé ne sont pas en place. Jamais de « 0 jour / tenant privé » affiché à tort.
5. **Déterministe d'abord, modèle ensuite** — le neuronal (P3) ne devient jamais l'unique barrière ; il complète les règles.
6. **Preuve, pas promesse** — chaque décision (score + politique + hash de ce qui est envoyé) est scellée dans la piste d'audit.
7. **Le texte est une donnée, pas une instruction** (anti-injection, repris de la RFC 0010).

## 4. Architecture cible — le pipeline `ai-guard`

Toutes les fonctions IA appellent le même garde avant tout envoi :

```
contenu / contexte assemblé
   ├─[0] kill-switch cabinet (isAiEnabled)            ── livré (P0)
   ├─[1] détection déterministe (pii-detect)          ── livré (P1)
   ├─[2] classifieur local (contextuel, optionnel)    ── P3
   │
   ├─ Score d'exposition (exposure-score)             ── livré (P1, observe-only)
   │
   ├─ Résolveur de POLITIQUE (client / org / mission) ── P2
   │     → autoriser · caviarder · bloquer · demander accord client
   │
   ├─ Caviardage des spans détectés (le % transmis chute) ── P2
   │
   ├─ Preuve scellée dans la piste d'audit (score + décision + hash) ── P2
   │
   └─ Appel modèle : Anthropic (+ en-têtes ZDR) OU routage tenant privé ── P2/P3
```

### 4.1 Couche 1 — détection déterministe (livrée)
Règles pures côté Deno. Fiable sur les formats connus, **aveugle au sensible contextuel**. Localisée Sénégal. Limite assumée : **le contenu des PDF/images n'est pas lisible côté edge** → marqué `non_inspecte` (voir §6, décision D).

### 4.2 Couche 2 — classifieur local (P3)
Mission binaire : « ce passage contient-il quelque chose à ne pas envoyer dehors ? ». Rattrape le contextuel (clause de confidentialité, donnée nominative noyée). Exécution : ONNX/WASM quantisé en Deno **avant** l'appel, ou dans le navigateur avant upload. Le « tenant privé » (vrai petit LLM auto-hébergé) est un **projet d'infra distinct** (pas Deno/Vercel).

### 4.3 Score d'exposition (livré, observe-only)
Agrège les signaux en `{ score, level, counts, pct_flagged }`. En P2, il devient l'entrée du résolveur de politique et alimente le **panneau pré-vol** (maquette validée) affiché avant confirmation d'une action IA.

### 4.4 Résolveur de politique (P2)
Data-driven (même esprit que les résolveurs existants). Entrées : niveau de sensibilité, consentement client, destination. Sortie : une **action** (autoriser / caviarder / bloquer / demander accord). Nouveau modèle de consentement + rétention **par client** (`cabinet_clients`), résolu au runtime.

### 4.5 Caviardage (P2)
Quand la politique l'exige, les spans détectés sont remplacés par des jetons (`[EMAIL]`, `[IBAN]`…) **avant** l'envoi. C'est le vrai gain : on continue d'utiliser l'IA tout en réduisant l'exposition réelle.

### 4.6 Destination & rétention (P2)
Conformément à la **Décision A**, le sensible « élevé » est **bloqué sans accord client** tant que le ZDR / le tenant privé ne sont pas confirmés — c'est la posture sûre par défaut. Le ZDR Anthropic (en-têtes de rétention réels) et le routage vers un modèle privé restent des évolutions possibles au-delà du P2, mais ne sont pas des prérequis. Dans tous les cas, l'UI reflète la destination **réelle**.

## 5. Preuve & conformité

- Chaque appel IA scelle dans la **piste d'audit probante** (F6) : score d'exposition, décision de politique, destination, et un **hash** du payload réellement envoyé (jamais le contenu en clair).
- `ai_calls_log.exposure_*` sert au suivi agrégé (RSSI). La couche 1 ne persiste **aucune valeur sensible** (positions + comptes only).
- RGPD : minimisation (caviardage), base légale explicite (consentement client), traçabilité, droit de couper (kill-switch).

## 6. Décisions (actées le 2026-10-02)

- **Décision A — Destination pour la sensibilité élevée → BLOQUER + ACCORD CLIENT.** Tant que ni ZDR Anthropic ni tenant privé ne sont confirmés, le sensible « élevé » est **bloqué sans accord explicite du client**. Le ZDR et le tenant privé restent des évolutions possibles (hors P2), mais ne sont pas un prérequis : la posture sûre s'applique dès maintenant.
- **Décision B — Consentement → PAR CLIENT, surchargeable par mission.** Stocké sur `cabinet_clients` (+ surcharge mission), horodaté et révocable. Résolu au runtime par le résolveur de politique.
- **Décision C — Politique par niveau → STANDARD.** `faible`=autoriser · `moyenne`=caviarder · `élevée`=demander accord client · `secret détecté`=bloquer (toujours, quelle que soit la destination).
- **Décision D — Contenu PDF/image → EXTRACTION PDF DÈS LE P2.** On ajoute une extraction de texte PDF côté edge pour scanner aussi les PDF (plus seulement DOCX/XLSX). Les images restent « non inspecté » (→ classifieur local P3).
- **Décision E — Seuils du score → VALEURS ACTUELLES.** Pondérations secret ×40 / financier ×10 / PII ×3 ; niveaux élevée ≥60, moyenne ≥25, sinon faible ; secret détecté = toujours élevée.

## 7. Feuille de route

- **P0 — livré** : kill-switch appliqué partout + UI honnête.
- **P1 — livré** : détection déterministe + score d'exposition (observe-only) + badge.
- **P2** : consentement **par client** (surchargeable mission) + résolveur de politique **standard** + **caviardage** des spans + actions **bloquer / demander accord** (sensible élevé bloqué sans accord, Décision A) + **extraction de texte PDF** (Décision D) + panneau pré-vol + scellement dans la piste d'audit.
- **P3** : classifieur local (ONNX/WASM) pour le contextuel ; inspection des **images** ; évolutions destination (**ZDR Anthropic** / **tenant privé**) pour lever le blocage du sensible élevé.

## 8. Limites assumées

- Le contenu des **PDF** sera inspecté dès le P2 (Décision D) ; les **images** restent non inspectées jusqu'au P3.
- Le score déterministe ne détecte pas le **sensible contextuel** (noms propres isolés, clauses) — c'est l'objet du P3.
- Un **tenant privé** réel suppose une infra d'inférence dédiée, hors de la stack Deno/Vercel actuelle.
