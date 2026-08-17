# RFC 0005 — Gëstu Policy

> Statut : **accepté** (décisions tranchées, maquette validée) — à implémenter.
> Dérive de : RFC 0001 (graphe d'organisation), 0002 (éditions & capacités), 0004 (Gëstu Risk, patterns de score et de connexion).
> Maquette de vision : artifact « Gëstu Policy » (registre de gouvernance vivant).

---

## 1. Thèse

La plupart des outils GRC stockent les politiques comme des **PDF morts** dans un dossier.
Gëstu Policy en fait des **objets de gouvernance vivants et connectés** :

- un **cycle de vie** (brouillon → publiée → retirée) avec versions et approbation scellée ;
- **connectés à l'écosystème** : une politique *prouve* un contrôle (Comply), *maîtrise* un risque (Risk-barrière), *répond* à une obligation (Regul) ;
- **deux niveaux d'attestation** : l'**adoption** (les membres l'ont lue) et l'**application effective** (le responsable atteste qu'elle est mise en œuvre, preuve à l'appui) ;
- **alimentant le score de confiance** sur trois axes : gouvernance, facteur humain, vérifiabilité.

Le fil rouge : *« Lue, c'est bien. Appliquée, c'est mieux. »* — c'est l'application effective, pas la
simple existence, qui fait vraiment la gouvernance.

---

## 2. Décisions actées

| # | Décision | Choix |
|---|---|---|
| Périmètre v1 | Ambition | **Complet** (tout le mockup) |
| Cycle de vie | États | **6 états** : brouillon → en revue → approuvée → publiée → révision → retirée. Approbation via le principe de cascade Comply. Péremption → révision automatique |
| Provenance | Création | **3 provenances** : rédaction native, génération IA, **import** d'un document existant (fichier joint) |
| Policy-as-Evidence | Sémantique | **Pré-rattachée, l'auditeur valide** — la politique est proposée comme preuve candidate ; la conformité reste la décision de l'auditeur |
| Force de preuve | Graduation | **Graduée** : approuvée + appliquée = forte ; approuvée seule = faible ; brouillon/périmée = aucune |
| Attestations | Modèle | **Deux** : adoption (membres, lecture) + application effective (responsable, preuve + périodicité) |
| Score | Axes | **Gouvernance + facteur humain + vérifiabilité** |
| Score | Déploiement | **Shadow** derrière le flag `policy_score_impact` (par org), comme `risk_score_impact` |

---

## 3. Modèle de données

Tout est **org-scoped** (RLS `organization_id = get_my_organization_id() and not is_client_role()`)
+ policy RESTRICTIVE `is_aal2()`, sur le modèle de Gëstu Risk (mig 00184).

### 3.1 Cœur

**`policies`**
- `id`, `organization_id`
- `title`, `summary`
- `provenance` CHECK(`native` | `ai` | `imported`)
- `status` CHECK(`draft` | `in_review` | `approved` | `published` | `revision` | `retired`)
- `dimension` `score_dimension` NULL — routage vers l'axe du score (défaut `governance`)
- `owner_user_id` → users (le **responsable** qui atteste l'application effective)
- `current_version_id` → policy_versions
- `review_period_months` int (périodicité de revue/attestation)
- `next_review_at` date (péremption → révision auto)
- `approved_at`, `published_at`, `retired_at`
- `created_by`, `created_at`, `updated_at`

**`policy_versions`**
- `id`, `policy_id`, `organization_id`
- `version_label` (ex. `v3.2`)
- `content` text NULL (native/ia) — **ou** `file_path` text NULL (importé/joint, Supabase Storage)
- `change_note`
- `approved_by` NULL, `approved_at` NULL (sceau d'approbation de la version)
- `created_by`, `created_at`

> Provenance & fichier : une politique importée porte son `file_path` sur la version ;
> une politique native/IA porte son `content`. Même cycle de vie ensuite.

### 3.2 Connexions écosystème

**`policy_control_links`** — *Policy-as-Evidence*
- `id`, `organization_id`, `policy_id`, `control_id`
- `evidence_catalog_id` NULL → la preuve attendue précise satisfaite
- unique(`policy_id`, `control_id`)
- La **force de preuve** n'est pas stockée : elle est **dérivée** du statut de la politique
  (approuvée+appliquée = forte, approuvée = faible, sinon nulle). L'auditeur voit la politique
  candidate + sa force ; la conformité du contrôle reste **sa** décision.

**`policy_risk_links`** — *Policy-as-Barrier* (Risk)
- `id`, `organization_id`, `policy_id`, `risk_scenario_id`
- `kind` CHECK(`preventive` | `detective` | `corrective`) — comme `risk_control_links`
- unique(`policy_id`, `risk_scenario_id`)
- Une politique **appliquée** devient une barrière du nœud papillon, à côté des contrôles.
  Son efficacité de barrière est dérivée de son application effective.

### 3.3 Attestations

**`policy_acknowledgements`** — adoption / lecture
- `id`, `organization_id`, `policy_id`, `policy_version_id`, `user_id`, `acknowledged_at`
- unique(`policy_version_id`, `user_id`)
- Taux d'adoption = attestés / membres éligibles → **facteur humain**.

**`policy_effectiveness_attestations`** — application effective
- `id`, `organization_id`, `policy_id`, `policy_version_id`
- `attested_by` → users (le responsable)
- `status` CHECK(`applied` | `partial` | `not_verified`)
- `evidence_note` text, `evidence_path` text NULL (preuve jointe)
- `attested_at`, `next_due` date
- La **dernière** attestation détermine l'état « appliquée » de la politique → gradue la preuve
  (§3.2) et alimente **gouvernance / vérifiabilité**.

### 3.4 Couverture (framework-driven)

Le jeu de **politiques requises** par référentiel est dérivé de l'existant :
- `evidence_catalog` gagne une colonne `kind` CHECK(`document` | `policy` | `record` | `config`) (défaut `document`).
- Les preuves attendues de type `policy`, distinctes sur les contrôles d'un référentiel,
  forment le **jeu requis**. Couverture = jeu requis avec une politique liée & approuvée vs **lacunes**.
- La rédaction IA cible les lacunes.

### 3.5 Flag

`feature_flags` : `policy_score_impact` (globally disabled par défaut), override par org — exactement
comme `risk_score_impact`.

---

## 4. Cycle de vie (6 états)

```
brouillon ──▶ en revue ──▶ approuvée ──▶ publiée ──▶ révision ──▶ retirée
                              (sceau)                    ▲   │
                                                         └───┘  (péremption / incident)
```

- **Approbation** : transition `in_review → approved` par un approbateur habilité (sceau doré sur la
  version). Réutilise le principe de cascade de validation de Comply ; v1 = un sceau, multi-étages en option.
- **Publication** : `approved → published` — la politique devient preuve candidate et barrière.
- **Péremption** : quand `next_review_at` est dépassé, la politique repasse en `revision`
  (et sa force de preuve retombe) — job/trigger.
- **Retrait** : `retired` — sort du registre vivant, conservée pour l'historique.

---

## 5. Intégration au score de confiance

Contribue à trois axes (client-side, dans le moteur `useSelfDimensionScores`, derrière le flag).

- **Gouvernance** : couverture pondérée du jeu de politiques requises —
  `mean(force(politique))` où forte=1, faible=0,5, lacune=0. Blend avec la gouvernance dérivée des
  contrôles (à caler en Phase score).
- **Facteur humain** : taux d'adoption (acknowledgements) des politiques publiées.
- **Vérifiabilité** : part des politiques approuvées + versionnées + application attestée (traçables).

Mode **shadow** : calculé et affiché, ne pèse sur le composite que si `policy_score_impact` est actif
pour l'org. Mécanisme identique au facteur `risk_mastery`.

> Tenancy (point de conception Phase Evidence) : une politique appartient à l'**organisation évaluée**.
> Dans une mission externe (cabinet ≠ audité), la surfacing des politiques de l'audité à l'auditeur
> suit le pattern de la promotion Risk (lecture via appartenance à la mission / SECURITY DEFINER).

---

## 6. UX / UI

Workspace **dédié** (sidebar contextuelle, comme Risk) :

- **Vue d'ensemble** : couverture, jeu requis vs lacunes, KPIs (politiques vivantes, lacunes, impact gouvernance).
- **Registre / Cycle de vie** : board Kanban 6 colonnes ; carte = politique + chips (gouvernance/humain) + sceau.
- **Créer** : trois provenances (rédiger / IA / **importer**).
- **Carte de couverture** : référentiel → politiques requises, couvert/lacune, clic pour combler (IA).
- **Document vivant** : versions + sceau + « satisfait N contrôles · barrière de M scénarios » + **double attestation**
  (anneau d'adoption + bloc application effective avec preuve et prochaine vérif).

Direction visuelle actée : **registre de gouvernance vivant** — fond papier, titres serif, indigo #7B68EE,
sceaux or #D4A843, fils de connexion vert forêt. Thème clair/sombre.

---

## 7. Plan par phases

| Phase | Contenu |
|---|---|
| **P1 — Modèle** | Migrations (policies, versions, links control/risk, acknowledgements, effectiveness, `evidence_catalog.kind`, flag `policy_score_impact`) + types + constants |
| **P2 — Registre & cycle de vie** | Workspace dédié + board 6 états + 3 provenances (éditeur natif, import upload Storage, brouillon IA) |
| **P3 — Policy-as-Evidence** | Lien politique ↔ contrôle, surfacing preuve candidate graduée dans l'évaluation Comply (l'auditeur valide) |
| **P4 — Double attestation** | Acknowledgements (membres) + effectiveness (responsable, preuve, périodicité) + UI |
| **P5 — Couverture** | Carte framework-driven (jeu requis vs lacunes) + rédaction IA des lacunes |
| **P6 — Policy-as-Barrier** | Politique = barrière dans le nœud papillon de Risk |
| **P7 — Score** | Gouvernance / facteur humain / vérifiabilité, shadow derrière `policy_score_impact` |
| **P8 — Activation** | Capacité `policy` (déjà à la carte) : nav + Hub + carte superadmin « Modules » (ajouter Policy) |

Sécurité transverse : RLS org-scoped + AAL2, écritures sensibles serveur, jamais d'`organization_id`
côté client, provenance & preuve traçables, aucune inflation d'audit (l'auditeur tranche).
