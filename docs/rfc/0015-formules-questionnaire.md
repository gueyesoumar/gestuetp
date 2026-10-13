# RFC 0015 - Formules de questionnaire (prise de connaissance / auto-évaluation)

**Statut** : décisions actées (voir §8) - prêt à implémenter (Lot 1)
**Prolonge** : le pipeline questionnaire existant (`questionnaire_templates` / `questions` / `questionnaire_instances` / `questionnaire_responses`, edges `launch-questionnaire` + `smart-questionnaire`), le mapping `question_controls` + `expected_answer` (étage 2, mig 00293/00295), RFC 0013 (éditions, `review_depth`, édition Entreprise réflexive).
**Objectif** : permettre au cabinet / régulateur de choisir, **au lancement**, la formule envoyée à l'audité - **prise de connaissance** (court, l'auditeur évalue) ou **auto-évaluation** (le client s'auto-note sur les contrôles, l'auditeur confirme) - **sans forker le moteur de questionnaire**.

---

## 1. Principe directeur

Une **formule = un `questionnaire_template` d'un `kind`**. Aucun nouveau sous-système : l'instance, le `snapshot`, les réponses, le pré-remplissage IA et la consommation en pré-verdicts restent strictement identiques. La seule nouveauté conceptuelle est le **choix de la formule au lancement** (aujourd'hui le front impose le 1er template actif du référentiel).

## 2. Existant réutilisé TEL QUEL (contrainte de non-contradiction)

| Brique | État actuel | Réutilisation |
|---|---|---|
| `questionnaire_templates` | déjà **multiple par référentiel** (`framework_id`, `is_active`) | on y ajoute juste `kind` |
| `questions` (+ `expected_answer`, `scope_exclude_value`) | questions d'un template | les questions self-assessment y sont générées |
| `question_controls` (question↔contrôle, poids) | mapping étage 2 | lien 1:1 question self↔contrôle |
| `launch-questionnaire` | crée l'instance + `snapshot` + pré-remplit ; **1 instance / mission** | on ajoute un `template_id` optionnel |
| `questionnaire_responses` + `smart-questionnaire` | réponses + pré-remplissage IA (confiance, preuve, sources) | inchangé |
| `cadrageHint` / `useCadrageGaps` | `expected_answer` vs réponse -> écart -> pré-suggestion par contrôle | **inchangé** |
| `control_assessments` | **source de vérité** du verdict | l'auto-évaluation **pré-suggère** ; l'auditeur confirme. On n'écrit JAMAIS de verdict automatiquement |
| échelle `CONFORMITY_LEVELS` | nc / pc / lc / c / na | options self alignées (c/pc/nc/na) |

## 3. Ajouts (minimal, additif)

1. **`questionnaire_templates.kind`** : `'context' | 'self_assessment'`, défaut `'context'`, backfill des existants -> `context` (non-régression totale).
2. **Génération automatique** des templates `self_assessment` depuis les contrôles de chaque référentiel (§4).
3. **`launch-questionnaire`** : accepte un `template_id` **optionnel** (validé = référentiel de la mission) ; sinon fallback = 1er actif (comportement actuel intact). Contrainte **1 instance / mission conservée**.
4. **Cadrage (front)** : `useTemplateQuestions` renvoie **tous** les templates actifs (+ `kind`) ; `LaunchQuestionnairePanel` gagne un **sélecteur de formule** + métadonnées (nb questions, qui évalue). La sélection de questions existante devient la **portée**.
5. **Portail** : les questions générées sont `single_choice` -> **déjà rendues** par le renderer existant ; présentation dédiée (par domaine + notation) branchée sur `snapshot.kind` (Lot 3).

## 4. Génération automatique des templates self-assessment (décision §8.b)

Pour **chaque référentiel** (existants + à la création/màj) :
- Fonction idempotente `public.sync_self_assessment_template(p_framework_id)` (SECURITY DEFINER) :
  - upsert d'un template `kind='self_assessment'` (`name` = « Auto-évaluation - <référentiel> », `is_active`) ;
  - pour chaque contrôle du référentiel : upsert d'une question (`code` = code du contrôle, `text` = intitulé, `question_type='single_choice'`, `options=['Conforme','Partiellement','Non conforme','Sans objet']`, `expected_answer='Conforme'`, `is_required`) ;
  - lien `question_controls` (question↔contrôle, poids 1) ;
  - suppression des questions orphelines (contrôle retiré).
- **Backfill** : une migration appelle la fonction pour tous les référentiels existants.
- **Maintien en phase** : la synchro est **déclenchée depuis le flux admin de gestion des référentiels** (edge `admin-framework` / publication), **pas** par un trigger brut sur `controls` (éviter les tempêtes de triggers pendant les seeds). À défaut de hook, un bouton admin « Resynchroniser » reste disponible.

> Implication assumée (choix « auto pour tous ») : 1 question par contrôle x N référentiels = quelques milliers de lignes `questions`. Sans impact perf ; inertes tant qu'aucune formule self n'est **lancée**.

## 5. Portée : ciblée vs complète (pas un 3e kind)

« Auto-évaluation **ciblée** » vs « **complète** » = la **sélection de questions** déjà existante appliquée au template self-assessment (sous-ensemble = périmètre retenu ; tout = complet). Figée dans le `snapshot`. Aucune table ni kind supplémentaire.

## 6. Consommation : des réponses aux pré-verdicts

- **Inchangé** : `expected_answer` ('Conforme') vs réponse -> `isUnfavorable` -> écart signalé par contrôle via `question_controls` (`cadrageHint`/`useCadrageGaps`).
- **Lot 3 (raffinement)** : mapping **option -> niveau de conformité** (Conforme->c, Partiellement->pc, Non conforme->nc, Sans objet->na) pour une **pré-suggestion de verdict précise** au contrôle (au-delà du simple « écart »). L'auditeur reste décideur (`control_assessments`).

## 7. Lots & séquencement

| Lot | Contenu | Visibilité |
|---|---|---|
| **1 - Socle** | migration `kind` + backfill ; `launch-questionnaire` accepte `template_id` ; `useTemplateQuestions` multi-templates + sélecteur de formule au cadrage | inerte tant qu'aucun template `self_assessment` n'existe |
| **2 - Génération** | `sync_self_assessment_template` + backfill tous référentiels + hook admin-framework | rend la formule disponible partout |
| **3 - Portail** | présentation auto-évaluation (par domaine, 4 options, pré-éval IA) + mapping option->niveau de conformité | expérience client dédiée + pré-verdict précis |
| **4 (option)** | côté Travaux : voir les pré-évaluations à côté des contrôles + confirmer en masse (réutilise la voie express « Conforme » existante) | gain auditeur |

Chaque lot : branche feat -> staging (snayz) -> PR main (gate), gates `typecheck`/`check:entities`/`build`.

## 8. Décisions actées

- **a.** Kinds = `context` | `self_assessment`. « Ciblée vs complète » = portée (sélection de questions), pas un 3e kind.
- **b.** Génération self-assessment = **automatique pour tous les référentiels** (backfill + à la création/màj via le flux admin), idempotente.
- **c.** Options d'auto-notation = **Conforme / Partiellement / Non conforme / Sans objet** (mappées c/pc/nc/na ; LC réservé à l'auditeur).
- **d.** **1 formule par mission** (on conserve la contrainte 1 instance / mission).
- **e.** Pré-verdict : simple « écart » (déjà là) en Lots 1-2 ; mapping fin option->niveau en Lot 3.

## 9. Non-régression (garanties)

- Templates existants -> `kind='context'` par défaut -> comportement identique.
- `launch-questionnaire` sans `template_id` = exactement l'actuel.
- 1 instance / mission conservée (pas de double questionnaire).
- Consommation (pré-verdicts) inchangée ; échelle de conformité réutilisée.
- Les questions self générées sont inertes tant qu'un template `self_assessment` n'est pas **lancé** sur une mission.

## 10. Hors scope

- Écriture automatique de `control_assessments` depuis l'auto-évaluation (l'auditeur confirme toujours).
- Multi-formules simultanées sur une même mission (contrainte 1 instance conservée ; ré-envoi = décision ultérieure).
- Édition Entreprise réflexive : utilise déjà le même moteur (RFC 0013) ; aucune divergence introduite.
