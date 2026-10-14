# RFC 0016 - Questions visibles au niveau des contrôles + bibliothèque de questions éditable par organisation

**Statut** : décisions actées (voir §10) - prêt à implémenter (Lot 1 livrable seul)
**Prolonge** : le pipeline questionnaire (`questionnaire_templates` / `questions` / `questionnaire_instances` / `questionnaire_responses`), le mapping `question_controls` + `expected_answer` (mig 00098/00293/00295), la génération self-assessment (RFC 0015, `sync_self_assessment_template`, mig 00305/00306), les éditions runtime (RFC 0013 : Cabinet / Regul / Entreprise).
**Objectif** : répondre à deux retours terrain complémentaires :
- **(3)** « On ne voit pas les questions en tant que tel au niveau des contrôles. »
- **(4)** « On doit pouvoir modifier manuellement les questions et sauvegarder cela dans la bibliothèque de l'organisation. »

---

## 1. État des lieux (vérifié dans le code)

### 1.1 Les questions SONT déjà reliées aux contrôles, mais peu visibles (issue 3)

La plomberie existe **entièrement** et n'est pas à refaire :
- `question_controls` (M-N question↔contrôle, poids) alimente déjà deux lectures :
  - `fieldwork/right-rail/useControlContext.ts` : `question_controls → questions(code, text, expected_answer) → questionnaire_responses` (jointure par `question_code`) → `CadrageAnswer[]`.
  - `fieldwork/useCadrageGaps.ts` : même chaîne sur toute la mission → `Set<control_id>` à écart.
- Rendu actuel : **uniquement dans le rail droit** du workspace contrôle :
  - `right-rail/ControlSignals.tsx` : compteur « N réponses de cadrage justifient ce contrôle » + pré-suggestion de verdict (si écart).
  - `right-rail/ControlContextTab.tsx` → `CadrageInline.tsx` : liste par question (code, texte, réponse, badge poids, marqueur « Écart »), section « Contexte ».
- La **zone centrale** d'évaluation (`fieldwork/ControlSinglePane.tsx` : `ControlVerdictCard`, `FindingsEditor`, `AiPreAnalysisSection`) **n'affiche pas** ces questions.
- Vestige : `right-rail/CadrageAnswersCard.tsx` existe mais n'est plus référencé.

> **Diagnostic issue 3** : ce n'est pas un manque de données, c'est un **défaut de surfaçage**. Les questions liées sont reléguées dans un onglet du rail. Il faut les rendre visibles **au plus près de l'acte d'évaluation**.

### 1.2 Les questions sont un catalogue 100 % global, non éditable par les cabinets (issue 4)

- `questionnaire_templates` : scoping **`framework_id` seul**. RLS `select` = tout authentifié si `is_active` ; **écriture = `service_role` uniquement**.
- `questions` (`unique(template_id, code)`) : même régime, écriture `service_role`.
- Seule surface d'écriture front = `features/admin/question-mapping/` (onglet « Cadrage ») via edges `admin-question-controls` / `admin-mapping-ai`, **réservée au platform-owner** (`requirePlatformOwner`). Elle édite le **mapping et la polarité** (liens, `expected_answer`, `scope_exclude_value`), **pas** le texte/les options/le type des questions.
- **Aucun `organization_id` / `cabinet_id`** sur `questionnaire_templates` ni `questions` (confirmé : 0 occurrence en migrations + types).

> **Diagnostic issue 4** : aujourd'hui un cabinet **subit** le socle. Il n'a aucun moyen d'adapter un questionnaire à sa méthodologie et de le réutiliser. Il faut introduire une **copie éditable propre à l'organisation**, sans toucher au socle partagé.

---

## 2. Principe directeur

1. **Issue 3 = surfaçage, pas de nouveau modèle.** On réutilise `useControlContext` / `CadrageInline` et on les remonte dans la zone centrale d'évaluation. Zéro migration.
2. **Issue 4 = scoping additif par `organization_id`.** `organization_id IS NULL` = **socle global** (comportement actuel, intact). `organization_id = <org>` = **copie éditable** de cette org. Un cabinet **duplique** un template socle dans sa bibliothèque puis l'édite ; le socle n'est jamais modifié par un cabinet.
3. **Non-contradiction** : instance unique par mission, `snapshot`, pré-remplissage IA, consommation en pré-verdicts (`cadrageHint`) **restent identiques**. Les seuls points de compat sont 3 requêtes à élargir (§6).

---

## 3. Issue 3 - Rendre les questions visibles au niveau du contrôle (« Les deux »)

Décision utilisateur = **Les deux** sens de navigation.

### 3.1 Contrôle → ses questions (sens principal)
- Ajouter dans la **zone centrale** (`ControlSinglePane`) une carte **« Questions de cadrage liées (N) »** réutilisant `CadrageInline` (déjà construit : code, texte, réponse, badge poids, marqueur « Écart »). Repliable, ouverte s'il y a au moins une réponse défavorable.
- Source : `useControlContext` (déjà appelé dans le rail), on remonte la même donnée, **pas de nouvelle requête** (le hook ou son résultat est partagé entre rail et pane).
- Le rail « Contexte » reste (ou devient un simple rappel) ; suppression/repurpose du vestige `CadrageAnswersCard.tsx`.

### 3.2 Question → ses contrôles (sens inverse)
- Déjà présent côté admin platform-owner (`QuestionMappingTab` / `MappingCoverage`).
- On l'expose **dans l'éditeur de bibliothèque org** (§5) : chaque question affiche les contrôles couverts (lecture de `question_controls`), pour que l'éditeur voie l'impact d'une modification.

> Issue 3 est livrable **seule et en premier** (Lot 1) : pur front, aucune dépendance au modèle org.

---

## 4. Issue 4 - Modèle de données (additif, rétro-compatible)

### 4.1 Migration `questionnaire_templates`
```sql
alter table public.questionnaire_templates
  add column organization_id uuid references public.organizations(id) on delete cascade,
  add column source_template_id uuid references public.questionnaire_templates(id) on delete set null;
-- organization_id NULL = socle global (défaut, comportement actuel)
-- source_template_id = template socle dont cette copie dérive (traçabilité / resynchro Lot 4)
create index idx_qt_org on public.questionnaire_templates(organization_id);
```
- `questions` : **inchangé** (scoping hérité via `template_id`, `on delete cascade` déjà là). La copie crée de nouvelles lignes `questions` rattachées au template copié.
- `question_controls` : **inchangé** ; les liens copiés pointent vers les **mêmes contrôles globaux**.
- Unicité : conserver `unique(template_id, code)` sur `questions` (chaque copie a son `template_id`). Décision D2 : index unique partiel `(organization_id, source_template_id) where organization_id is not null` → **une seule copie par socle et par org**.

### 4.2 Sémantique de copie (« fork »)
Edge dédiée `org-template` (service_role), action `fork` :
1. Vérifie l'autorisation (§7) et que la source est un **socle** (`organization_id IS NULL`) du référentiel.
2. Insère un nouveau `questionnaire_templates` : `organization_id = <org du caller>`, `source_template_id = <socle>`, `kind` recopié, `name` = « <nom socle> (ma bibliothèque) » (éditable).
3. Copie toutes les `questions` (texte, options, type, `expected_answer`, `scope_exclude_value`, `sort_order`, `show_if`, `prefill_source`).
4. Copie `question_controls` (mêmes `control_id`, mêmes poids) en remappant `question_id` vers les nouvelles questions.
5. Renvoie l'`id` de la copie.

### 4.3 Édition
Actions edge `org-template` (toutes **restreintes aux templates `organization_id = org du caller`**, jamais le socle) : `update_template` (nom, is_active), `create_question`, `update_question` (texte/options/type/required/sort/expected/scope_exclude), `delete_question`, `reorder_questions`, `set_question_controls` (liens+poids), `delete_template`.

---

## 5. Issue 4 - Surface d'édition (bibliothèque org)

- Nouvelle page **« Bibliothèque de questionnaires »** côté cabinet (sous Paramètres / Référentiels de l'org, selon l'édition) :
  - liste les référentiels disponibles ; pour chacun : le(s) template(s) socle (lecture seule, badge « Socle ») + les copies de l'org (badge « Ma bibliothèque »).
  - bouton **« Personnaliser pour mon organisation »** sur un socle → `fork` → ouvre l'éditeur.
  - **Éditeur de questions** : réutilise les patterns de `question-mapping/MappingEditor` + l'édition inline d'`AdminFrameworkDetailPage` (texte, options, type, requis, ordre, réponse attendue, liens contrôles avec aperçu de couverture).
- **Au lancement** (`LaunchQuestionnairePanel`) : le sélecteur de formule liste le socle **et** les copies de l'org (labellisés). Choix libre. (Substitution auto socle→org = §10-D3.)
- Respecte les règles projet : composants < 150 lignes (découpage éditeur en sous-composants), selects centralisés pour les types de question, gestion d'erreur Supabase explicite, cleanup des `useEffect`.

---

## 6. Points de compatibilité (non-régression, critiques)

| Brique | Changement | Garantie |
|---|---|---|
| `sync_self_assessment_template` (00306) | ajouter `and organization_id is null` à la recherche/upsert du template self | ne **touche jamais** une copie d'org ; socle inchangé |
| `useTemplateQuestions` | filtre `.or('organization_id.is.null,organization_id.eq.<org>')` | sans copie d'org = exactement l'actuel |
| `launch-questionnaire` (validation template) | requête `framework_id + is_active + (organization_id null OR = mission.cabinet_id)` | sans `template_id` = fallback actuel ; snapshot inchangé |
| RLS `questionnaire_templates` SELECT | `is_active AND (organization_id IS NULL OR organization_id = get_my_organization_id())` | socle visible par tous ; copie visible **par la seule org** |
| RLS `questions` SELECT | `exists(qt where qt.id=template_id AND is_active AND (org IS NULL OR org = get_my_organization_id()))` | pas de fuite inter-cabinets |
| `question_controls` SELECT | inchangé (`using(true)`), ne porte que des `control_id` globaux | aucune donnée sensible exposée |

Toutes les policies utilisent `get_my_organization_id()` (SECURITY DEFINER existant) → **pas de récursion RLS** (CLAUDE.md §3).

---

## 7. Sécurité

- **Écriture 100 % côté edge `service_role`** (CLAUDE.md §3) ; aucune écriture directe RLS sur `questionnaire_templates` / `questions` par les clients.
- **Cloisonnement** : chaque action vérifie `template.organization_id = get_my_organization_id(caller)` ; refus si cible = socle (`organization_id IS NULL`) ou autre org → pas d'IDOR, pas d'altération du socle partagé.
- **Autorisation** : gate par permission (§10-D1). Jamais un rôle `client` (portail) ; réservé au staff cabinet/régulateur habilité.
- **RLS lecture** cloisonnée par `get_my_organization_id()` ; socle en lecture publique (déjà le cas).
- **Validation d'entrées** : `question_type` dans l'enum centralisé, `options` JSON validé, `code` normalisé, longueur bornée. Messages d'erreur génériques côté client, détail en logs serveur (CLAUDE.md §3).
- **Édition Regul / Entreprise** : le scoping par `organization_id = cabinet_id` fonctionne pour toutes les éditions ; Entreprise réflexive (`client_id = cabinet_id`) = l'org édite sa propre bibliothèque, cohérent.

---

## 8. Lots & séquencement

| Lot | Contenu | Dépend de | Visibilité |
|---|---|---|---|
| **1 - Questions au contrôle (issue 3)** | carte « Questions de cadrage liées » dans `ControlSinglePane` (réutilise `CadrageInline`/`useControlContext`) ; nettoyage vestige | rien | **gain immédiat**, pur front |
| **2 - Modèle org (issue 4)** | migration `organization_id` + `source_template_id` + RLS ; compat `sync`/`launch`/`useTemplateQuestions` ; edge `org-template` (`fork` + éditions) | (aucune) | inerte tant qu'aucune copie créée |
| **3 - Éditeur bibliothèque** | page « Bibliothèque de questionnaires » + éditeur de questions + sélecteur de formule élargi au lancement | Lot 2 | cabinet personnalise et lance ses formules |
| **4 (option)** | « Mettre à jour depuis le socle » : diff socle↔copie quand le socle évolue (via `source_template_id`), application opt-in | Lot 2 | maintenance des copies |

Chaque lot : branche feat → staging (snayz) → PR main (gate) ; gates `typecheck` / `check:entities` / `check:accents` / `build`.

## 9. Non-régression (garanties)

- `organization_id NULL` partout par défaut → socle = comportement actuel strict.
- `launch-questionnaire` / `useTemplateQuestions` sans copie d'org = inchangés.
- `sync_self_assessment_template` ne cible que le socle → self-assessment global intact.
- Instance unique par mission conservée ; `snapshot` et consommation pré-verdicts inchangés.
- Issue 3 n'introduit aucune migration ni requête nouvelle (réutilise `useControlContext`).

## 10. Décisions actées

- **D1 - Qui édite la bibliothèque org ?** → **Permission dédiée `can_manage_question_library`** (attribuable finement, cohérente avec le modèle de permissions existant). Jamais le rôle `client`.
- **D2 - Nombre de copies ?** → **Une copie éditable par template socle et par org** (unicité `(organization_id, source_template_id)`). Copies multiples nommées = évolution ultérieure si besoin.
- **D3 - Au lancement, socle + copies ?** → **Lister les deux, labellisés** (badge « Socle » / « Ma bibliothèque »). Choix libre de l'auditeur.
- **D4 - Évolution du socle ?** → **Propagation manuelle opt-in (Lot 4)**, via `source_template_id`. Jamais d'écrasement automatique d'une copie.
- **D5 - Périmètre d'édition Lot 3** → **Les deux kinds** (`context` et `self_assessment`). L'édition d'un `self_assessment` copié le **fige** : il ne resynchronise plus automatiquement depuis les contrôles (devient autonome). Le socle self reste piloté par `sync_self_assessment_template`.

## 11. Hors scope

- Modification du socle global par un cabinet (toujours platform-owner only).
- Partage d'une bibliothèque entre organisations.
- Écriture automatique de `control_assessments` (l'auditeur confirme toujours, inchangé).
- Versioning fin des copies (au-delà de `source_template_id`).
