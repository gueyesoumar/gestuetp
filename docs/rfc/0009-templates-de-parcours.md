# RFC 0009 — Templates de parcours (désélection d'étapes/sous-étapes par le cabinet)

> Statut : **proposition** (cadrage, avant tout code).
> Dérive de : RFC 0003 (moteurs de mission — `workflow_version`, snapshot par mission, en prod mig 00181-00182).
> Ambition retenue : **Option A** (sous-étapes + phases déjà sautables). L'option C (parcours entièrement composable, retrait de phases médianes) est **hors périmètre** de cette RFC — voir §9.

---

## 1. Thèse

Le parcours d'audit et le contenu de ses étapes sont parfois **trop lourds** pour certaines missions/clients. On veut permettre à un **cabinet** de définir un **template de parcours** en **désélectionnant** des étapes et sous-étapes — sans toucher au cœur de la machine à états.

La clé est une distinction que le code impose déjà : **une phase** est un *statut de mission* (chaîné par un trigger SQL) ; **une sous-étape** est du *contenu à l'intérieur d'une phase* (pur rendu). Désélectionner une sous-étape est sûr ; désélectionner une phase médiane casserait la machine à états. Cette RFC n'ouvre la désélection qu'à ce qui est **structurellement sûr** : toutes les sous-étapes optionnelles + les deux seules phases déjà sautables (**Revue client**, **Plan d'action** virtuel).

---

## 2. Constat (état réel du code)

Cartographie du 2026-09-16.

- **Parcours codé en dur** : 3 tableaux TS dans `src/features/missions/mission-constants.ts` (`MISSION_PHASES` audit 7 phases, `CONTINUOUS_SUPERVISION_PHASES`, `CONTROLE_PHASES` 5 phases). Résolveur = `getMissionPhases(mission)` = f(`workflow_version`, `kind`), 100 % client.
- **Machine à états SQL** : enum `mission_status` figé à 7 valeurs (`00012`) + trigger `missions_status_transition_guard` (`00148`) = liste blanche d'adjacences en dur. `internal_review→closure` ET `client_review→closure` existent tous deux → **la Revue client est déjà légalement sautable** (c'est ce que font les moteurs contrôle/supervision).
- **Snapshot par mission** : `missions.workflow_version` (texte, figé au INSERT par `trg_mission_snapshot_engine`, `00181`). Snapshot **scalaire** (le moteur), pas le parcours détaillé.
- **Désélection déjà présente mais en dur** : en moteur contrôle, l'onglet **Risques** du cadrage est masqué et le **Questionnaire** devient optionnel — via des `if (isControle)` dispersés (`MissionScopingTab.tsx`, `MissionInternalReviewTab.tsx`, `useFieldworkState`). Aucun mécanisme générique, aucune configuration cabinet.
- **Config par org** : seul le **superadmin** choisit le moteur (`organizations.workflow_version` via edge `admin-set-org-engine`). Le cabinet ne configure rien du parcours.
- **Patron de perso cabinet réutilisable** : `organization_vocab` + `useReviewLabels`/`useVocab` (clé/valeur par org, résolution runtime, repli défaut) ; onglet `WorkflowSettingsTab.tsx` déjà présent.

**Dépendances dures à surveiller** : `STATUS_TO_PHASE_INDEX` exhaustif et `overallPercent = ((phaseIndex+1)/6)*50+…` (dénominateur `/6` en dur) dans `useMissionProgress.ts` ; visibilité client bornée par RLS `status in ('client_review','closure')` (`00148`) ; générateurs PDF de cadrage/clôture consommant risques/questionnaire.

---

## 3. Ce qui est désélectionnable (le catalogue, verrouillé côté serveur)

Le template ne peut désélectionner que des clés d'une **liste blanche** — tout le reste est structurellement obligatoire et grisé dans l'UI.

**Phases (désélectionnables) :**
- `client_review` — Revue client (déjà sautable en base).
- `action_plan` — Plan d'action (phase **virtuelle**, pur affichage en clôture).

**Phases OBLIGATOIRES (jamais désélectionnables) :** `scoping`, `planning`, `fieldwork`, `internal_review`, `closure` — chaînées dans le trigger `00148` et indexées dans `STATUS_TO_PHASE_INDEX`.

**Sous-étapes (désélectionnables) :**
- Cadrage : `scoping.risks` (Risques), `scoping.questionnaire` (Questionnaire), `scoping.documents`, `scoping.actors`.

**Sous-étapes OBLIGATOIRES :** le périmètre du cadrage (`scoping.scope`), la **totalité des Travaux** (les étapes guidées Observer/Documenter/**Analyser**/**Validation** — Analyser = conformité+constats et Validation = soumission sont le noyau ; retirées de la liste blanche par la mig 00252, INC 2b abandonné), la revue interne, la clôture.

> La liste blanche est **la garde-fou centrale** : un template ne peut jamais retirer une phase médiane ni un noyau obligatoire, donc la machine à états et les gates restent intacts (aucune migration d'enum ni de trigger `00148`).

---

## 4. Modèle de données

**Nouvelle table `organization_workflow_templates`** (un ou plusieurs templates nommés par org) :

| colonne | type | rôle |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid → organizations | cabinet propriétaire |
| `name` | text | nom du template (« Mission allégée », « Contrôle rapide »…) |
| `disabled_steps` | text[] | clés désélectionnées (⊆ liste blanche §3) |
| `is_default` | boolean | template appliqué par défaut aux nouvelles missions de l'org |
| `created_at` / `updated_at` / `updated_by` | | |

Contrainte : `unique(organization_id, name)` ; au plus un `is_default` par org (index partiel).

**Snapshot par mission** — nouvelle colonne `missions.workflow_disabled_steps text[] not null default '{}'`, **figée à la création** par extension du trigger existant `trg_mission_snapshot_engine` (`00181`) : il copiera `disabled_steps` du template `is_default` de l'org (ou `{}` si aucun). → Éditer le template plus tard **n'impacte pas** les missions en cours (même sûreté que RFC 0003).

*(Phase 2 différée : sélection d'un template nommé au moment de la création de mission plutôt que le seul `is_default`.)*

---

## 5. Résolveur (généralisation des `if (isControle)`)

Un point d'entrée unique, lu partout : `isStepEnabled(mission, key)` = `!mission.workflow_disabled_steps.includes(key)`.

- `getMissionPhases(mission)` (mission-constants.ts) : après sélection du tableau du moteur, **filtre** `client_review`/`action_plan` s'ils sont désélectionnés.
- `useMissionProgress.ts` : dénominateur de progression **dérivé du nombre de phases retenues** (fin du `/6` en dur), `STATUS_TO_PHASE_INDEX` inchangé (les phases obligatoires gardent leurs index).
- Sites `if (isControle)` (`MissionScopingTab`, `MissionInternalReviewTab`, `useFieldworkState`) : remplacés par `isStepEnabled(mission, 'scoping.risks')` etc. Le comportement contrôle actuel devient un **cas particulier** (un template implicite du moteur).
- Rendu (`MissionDetailPage`, `MissionStepper`) : une phase désélectionnée n'est ni rendue ni navigable.

---

## 6. UI de configuration (cabinet)

Greffée sur **`WorkflowSettingsTab.tsx`** (réglages org), patron `useReviewLabels`/`useVocab` :
- Éditeur de template : cases à cocher des étapes/sous-étapes, **les obligatoires grisées + verrouillées** avec une note (« étape structurante, non désactivable »).
- Un template `is_default` sélectionnable ; aperçu du parcours résultant.
- Écriture réservée aux **rôles privilégiés du cabinet** (permission type `can_manage_workflow`), pas à tout le staff.

---

## 7. Sécurité & multi-tenant

- **Liste blanche server-side** : toute écriture de `disabled_steps` est validée (⊆ liste blanche §3) côté serveur (edge ou fonction `SECURITY DEFINER`) — un template ne peut jamais retirer une phase obligatoire, même via appel direct.
- **RLS** `organization_workflow_templates` : `select` staff du cabinet ; `write` réservé aux rôles privilégiés du cabinet (calqué sur `missions_update_lead_associate` + permission). Le moteur (`workflow_version`) reste **superadmin-only** — le cabinet raffine, il ne choisit pas son moteur.
- **Machine à états intacte** : aucune adjacence retirée (seules `client_review`/`action_plan` sautent, déjà légal) → pas de mission bloquée.
- **Visibilité client préservée** : `closure` reste obligatoire → l'assujetti voit toujours les constats en clôture (RLS `cp_*` inchangée). Si `client_review` désélectionné, comportement = moteur contrôle (déjà éprouvé).
- **Rapports** : les générateurs PDF vérifient `isStepEnabled` avant de consommer risques/questionnaire.

---

## 8. Plan par incréments

- **INC 1 — Modèle + snapshot** : migration (table + `missions.workflow_disabled_steps` + extension trigger `00181` + RLS + validation liste blanche). `database.types.ts` à la main.
- **INC 2 — Résolveur** : `isStepEnabled`, `getMissionPhases` filtrant, `useMissionProgress` dénominateur dérivé. Généraliser les `if (isControle)` (comportement inchangé à template vide → non-régression).
- **INC 3 — UI cabinet** : éditeur de template dans `WorkflowSettingsTab`, écriture protégée.
- **INC 4 — Rapports & bords** : garde-fous générateurs PDF, aperçu parcours.

Chaque incrément : analyse d'impact + validation avant code, feat → staging → PR prod (le gate se déclenche pour INC 1 = migration).

---

## 9. Hors périmètre (option C, différée)

Retrait de **phases médianes** (ex. Planification) : nécessiterait de rendre l'enum `mission_status` flexible, de rendre les adjacences du trigger `00148` dépendantes du snapshot, de refondre progression et RLS de visibilité client. Chantier lourd à fort risque — à formaliser dans une RFC séparée si un besoin métier fort émerge.

---

## 10. Décisions (actées le 2026-09-16)

1. **Un seul template `is_default` par org** pour les INC 1-4. La table reste multi-templates. **Phase 2 (en cours)** : templates nommés + choix à la création — INC 5 (backend : `missions.workflow_template_id` + `create_mission_tx(p_template_id)` + trigger résout le template choisi (fallback `is_default`) + auto-démotion du défaut, mig 00253), INC 6 (éditeur multi-templates CRUD), INC 7 (sélecteur au wizard de création). `is_default` devient « pré-sélectionné au wizard ».
2. **Liste blanche maximale** : on rend désélectionnable **tout ce qui est techniquement sûr** (n'appartient pas au noyau structurant d'une phase et ne casse ni la machine à états, ni la visibilité client, ni un gate). Enumération exhaustive figée à l'INC 2 après revue de chaque phase ; seuls restent obligatoires : les 5 phases médianes, le périmètre du cadrage, la saisie des constats, la revue interne, la clôture.
3. **Nouvelle permission `can_manage_workflow`** (clé dans `platform_roles.permissions`), distincte des permissions existantes, requise pour éditer le template. Créée à l'INC 1 (défaut : accordée aux rôles privilégiés type Associé/Lead), vérifiée en RLS + UI.
