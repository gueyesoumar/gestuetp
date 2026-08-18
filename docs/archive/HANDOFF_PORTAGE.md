# HANDOFF_PORTAGE.md — Plan de portage du handoff Claude Design

> Synthèse des décisions et chantiers issus de la transposition du handoff Claude Design (6 écrans : Hub, Wizard, Phase 2 cabinet, Phase 2 client, Phase 3, Phase 4) vers la codebase Gëstu Comply.
>
> **Date de référence :** 2026-05-04
> **Périmètre :** 6 écrans / 7 phases du cycle d'audit
> **À lire avant :** [CLAUDE.md](CLAUDE.md), [BRAND.md](BRAND.md)
> **Mockups de référence :** dossier [mockups/](mockups/) (fichiers `handoff-1-*.html` à `handoff-6-*.html`)

---

## Comment utiliser ce document

Ce document est le contrat de portage du handoff Claude Design. Il liste :

1. Les **refactors architecturaux** validés (avec leurs implications data model)
2. Les **migrations SQL** consolidées dans l'ordre
3. Les **Edge functions** à créer ou refactorer
4. Les **composants UI** à refactor par phase
5. La **roadmap recommandée** en 5 vagues
6. La **stratégie de ship** (ce qui peut sortir indépendamment)
7. Les **risques majeurs** à anticiper

Chaque décision est traçable à un mockup et à une mémoire produit (cf. dossier `~/.claude/projects/.../memory/`).

---

## 1. Refactors architecturaux validés

Cinq décisions structurantes prises pendant la transposition. Chacune impacte plusieurs phases — l'ordre d'exécution est important.

### A. `question_controls` (many-to-many cadrage ↔ contrôles)

**Décision** : créer une table de liaison entre les questions du questionnaire de cadrage et les contrôles d'un référentiel. Une question peut alimenter N contrôles, un contrôle peut être informé par N questions.

**Pourquoi** : sans ce lien, le questionnaire de prise de connaissance (sections GOV/MAT/OPS/INC/ATT) n'alimente jamais l'évaluation des contrôles en phase 4 — l'auditeur évalue chaque contrôle from scratch en perdant le contexte client.

**Bénéfices en aval** :
- Phase 2 client : upload inline par question rattache automatiquement les documents aux preuves attendues sur les contrôles concernés
- Phase 4 : l'auditeur voit en haut du workspace une carte "Réponses cadrage liées" avec les réponses pertinentes
- IA : les suggestions smart-analyse reçoivent la chaîne complète (question + réponse + doc + contrôle) → constats plus pertinents

**Mémoire détaillée** : `project_question_controls_link.md`

### B. `assessment_findings` (modèle findings-centric)

**Décision** : remplacer les textareas plats `findings`, `recommendations`, `risk_notes`, `classification` de `control_assessments` par une table `assessment_findings` (N findings par assessment, chacun autonome).

**Pourquoi** : un seul contrôle évalué produit typiquement plusieurs constats indépendants (3 NC mineures + 1 NC majeure + 1 point fort). Le modèle textarea unique force le fourre-tout, casse le rapport et le plan d'action.

**Bénéfices en aval** :
- Plan d'action (Phase 7) : chaque finding avec recommendation devient un item d'action plan automatiquement
- Rapport PDF : rendu naturel comme une liste structurée
- IA : suggestions retournées comme `findings[]` avec classification par finding
- Suivi audit : statut individuel par finding (open / in_progress / resolved)

**Mémoire détaillée** : `project_findings_centric.md`

### C. `control_comments` (discussion par contrôle)

**Décision** : nouvelle table de commentaires ancrés sur un contrôle, avec mentions @user et threading léger.

**Pourquoi** : aujourd'hui zéro discussion granulaire. Les chefs de mission communiquent par mail / Slack / au pire dans le commentaire de validation. Un thread par contrôle améliore la traçabilité et raccourcit les boucles de revue.

**Scope** : pattern visible sur le mockup Phase 4 (onglet "Discussion" du rail droit). Nécessite RLS et notifications.

### D. `controls.audit_checklist` (points d'attention par contrôle)

**Décision** : checklist de questions d'audit gérée par les admins Gëstu, exposée à l'auditeur en phase 4 (Step 1 Observer du mode Guidé).

**Pourquoi** : la tip card actuelle est générique ("Que dit la politique en théorie ?"). Avec une checklist par contrôle, on guide l'auditeur sur les bons points à vérifier (chiffrement, BYOD, MFA, wipe à distance...).

**Variante dynamique** : en complément, des points d'attention générés à partir des réponses cadrage du client (via `question_controls`). Ex : "OPS-04 : le RSSI a déclaré Entra ID + Okta + solution interne. Vérifier la cohérence MDM sur les 3."

### E. Lettre de mission générée à la création

**Décision** : ajouter un step 6 "Lettre de mission" dans le wizard de création (entre Calendrier et Confirmation). Génère un PDF stocké dans le dossier mission. Pas de signature électronique en v1.

**Pourquoi** : la lettre est aujourd'hui produite en phase 7 clôture, ce qui est trop tard pour formaliser l'engagement contractuel. Au moment de la création de mission, on a déjà tout le contexte nécessaire.

**Mémoire détaillée** : `feedback_mission_create.md`

---

## 2. Migrations SQL consolidées

Toutes les migrations respectent la convention CLAUDE.md (`up` + `down`, pas de récursion RLS, fonctions SECURITY DEFINER si besoin).

```
00100_question_controls_up.sql
  └─ table question_controls(question_id, control_id, weight)
  └─ index on (question_id), (control_id)
  └─ RLS : SELECT authenticated, INSERT/UPDATE/DELETE service_role only
  └─ colonne nullable evidence_catalog_id sur questionnaire_template_questions

00101_assessment_findings_up.sql
  └─ table assessment_findings(id, assessment_id, ord, classification, description, risk, recommendation, priority, proposed_deadline, ai_generated, created_at, updated_at)
  └─ index on (assessment_id, ord)
  └─ RLS : alignée sur control_assessments (même périmètre cabinet/client)

00102_assessment_findings_migrate.sql
  └─ INSERT INTO assessment_findings (assessment_id, classification, description, risk, recommendation)
     SELECT id, COALESCE(classification, 'minor_nc'), findings, risk_notes, recommendations
     FROM control_assessments
     WHERE findings IS NOT NULL AND findings <> ''
  └─ best-effort : 1 finding par assessment legacy, à retravailler par les auditeurs lors de la prochaine session

00103_control_assessments_deprecate.sql
  └─ ATTENTION : ne pas DROP les colonnes legacy avant 2 sprints minimum
  └─ pour l'instant : commentaires SQL pour signaler la dépréciation
  └─ DROP réel dans une migration séparée après vérification que tous les composants utilisent assessment_findings

00104_control_comments_up.sql
  └─ table control_comments(id, mission_id, control_id, author_id, body, parent_id, mentions[], created_at)
  └─ RLS : SELECT membres mission, INSERT membres mission
  └─ trigger : créer notification sur mention

00105_controls_audit_checklist_up.sql
  └─ colonne audit_checklist text[] sur controls
  └─ INSERT/UPDATE service_role only
  └─ seed à faire dans un script séparé (00106 ou via outil admin)

00106_missions_letter_pdf_url_up.sql
  └─ colonne letter_pdf_url text sur missions
  └─ colonne letter_tone text DEFAULT 'standard' (standard / formel / concis)
```

Chaque fichier `_up.sql` a son `_down.sql` permettant le rollback (cf CLAUDE.md règle #6).

**Important** : tester chaque migration avec un compte client non-admin pour vérifier les RLS avant déploiement.

---

## 3. Edge functions

### À refactorer

**`smart-analyse`** : retourne désormais une structure JSON avec une liste de findings :

```json
{
  "confidence": 0.83,
  "overall_maturity": "lc",
  "findings": [
    {
      "classification": "minor_nc",
      "description": "...",
      "risk": "...",
      "recommendation": "...",
      "priority": "high"
    },
    ...
  ],
  "sources_analyzed": { "documents": 3, "cadrage_answers": 2 }
}
```

L'ancienne signature (textes plats) doit rester supportée le temps de la migration via un flag `format=v2`. Versionner explicitement.

**`launch-questionnaire`** : à compléter pour auto-créer les `mission_evidence_requests` à partir de `question_controls × in_scope_controls` au moment où le questionnaire est lancé. Aujourd'hui les requêtes d'évidence sont créées séparément.

### À créer

**`create-letter-of-mission`** : génère le PDF de lettre de mission depuis les données mission. Template HTML → PDF (lib type `jspdf` côté serveur, ou Resend `react-email` rendu en PDF).

**`smart-plan-hypotheses`** : retourne les critères utilisés par l'IA SmartPlan (compétences déclarées, charges historiques, secteur, capacité restante). Alimente la modale "Voir les hypothèses" du Phase 3 Planning.

### Inchangées

- `evidence-reminders` (cron daily 07:00 UTC)
- `assign-controls`
- `create-mission`

---

## 4. Composants UI à refactor par phase

### Hub (Missions list)

| Composant | Action | Effort |
|---|---|---|
| `MissionsCardsView` | Phase mini-ribbon (7 segments) sur chaque carte, supervision banner animé (gradient shimmer) | XS |
| `MissionsKanbanView` | Pas de changement structurel | — |
| `MissionsSplitView` | Pas de changement structurel | — |

**Décision retenue** : pas de KPI strip sur la liste missions (les KPI agrégés vivent sur DashboardPage). Réf : `project_kpi_placement.md`.

### Wizard de création (Phase 1)

| Composant | Action | Effort |
|---|---|---|
| `MissionCreatePage` | Passage 6 → 7 steps | S |
| `MissionLetterStep` | **Nouveau** composant : aperçu PDF avec sélecteur de ton + toggle mentions légales | M |
| `MissionConfirmStep` | Ajout callout forest si engagement = continuous_supervision (annonce auto-création cycle Q) | XS |

### Phase 2 Cabinet (Cadrage)

| Composant | Action | Effort |
|---|---|---|
| `MissionOverviewTab` | **Refonte complète** : KPI strip 4 tuiles + reminder banner contextuel + domain progress + contacts + activity feed | L |
| `MissionDetailHeader` | Phase tabs avec distinction `active` (onglet) vs `current-phase` (live-dot) | S |
| `MissionScopingTab` | **Inchangé** (5 sub-tabs : Fiche client / Périmètre / Questionnaire / Documents / Risques) | — |

### Phase 2 Client

| Composant | Action | Effort |
|---|---|---|
| `QuestionnaireWizard` | **Bascule en long-form par section** (vs wizard une-question-à-la-fois actuel) | L |
| `DocumentUploadSection` | Étendu pour upload inline par question | M |
| `QuestionDelegation` | **Nouveau** : assignation d'une question à un autre user du portail client | M |
| `ConditionalFollowUp` | **Nouveau** : bandeau gold pour les questions conditionnelles | XS |

**Pré-requis** : refactor A (`question_controls`) terminé, sinon l'inline upload n'a pas de cible.

### Phase 3 Planning

| Composant | Action | Effort |
|---|---|---|
| `WorkProgramTable` | Multi-select bulk + table 6 colonnes (drop "Statut") | M |
| `PlanningWorkloadSection` + `PlanningGanttSection` | Fusion en une seule card avec onglets Charge / Calendrier | S |
| `PlanningActionsSection` | Pas de change | — |
| `RiskCallout` | **Nouveau** : P1 unassigned + CTA pré-ciblé sur auditeur le moins chargé | S |
| `SmartPlanHypothesesModal` | **Nouveau** : modale détaillant les critères IA pour transparence | S |

**Décision retenue** : pas de due dates par contrôle. Réf : `feedback_planning.md`.

### Phase 4 Workspace (Travaux terrain)

| Composant | Action | Effort |
|---|---|---|
| `ControlWorkArea` | **Refonte findings-centric** : remplacer les textareas Constat/Reco/Risque par une liste éditable de `FindingCard`. Layout flex column avec footer fixe (pas de sticky) | XL |
| `FindingCard` | **Nouveau** : card éditable avec classification + description + risk + recommendation + priority + actions (monter/descendre/supprimer) | M |
| `CadrageEvidencePanel` | **Nouveau** : carte forest "Réponses cadrage liées" en haut du workspace | S |
| `ControlAuditChecklist` | **Nouveau** : tip card avec checklist statique du contrôle + points dynamiques du cadrage | S |
| `ControlCommentsPanel` | **Nouveau** : onglet Discussion du rail droit, threading + mentions | M |
| `ContextRailToggle` | **Nouveau** : bouton topbar pour replier/déplier le rail droit | XS |
| `GuidedWorkflow` + steps | Refactor Step 3 Analyser pour intégrer la liste de findings (au lieu d'un seul constat) | M |
| `AnalyserStep` | AI panel propose une liste de findings au lieu d'un texte plat | M |

**Pré-requis** : refactors A (cadrage liée) + B (findings-centric) + D (audit checklist) en place.

### Phase 7 Action Plan + Rapport

| Composant | Action | Effort |
|---|---|---|
| `MissionActionPlanTab` | Refactor pour consommer `assessment_findings` au lieu de `control_assessments.recommendations` | M |
| Générateur PDF rapport | Itérer sur findings au lieu de textareas legacy | M |

---

## 5. Roadmap recommandée — 5 vagues

### Vague 1 — Fondations (~3 semaines)

**Bloque la suite. À shipper en premier.**

- [ ] Migration A (`question_controls` + colonne `evidence_catalog_id`)
- [ ] Migration B (`assessment_findings` + script de migration des données existantes)
- [ ] Migration D (`controls.audit_checklist`)
- [ ] Refactor Edge function `smart-analyse` (retourne `findings[]`)
- [ ] Seed `question_controls` pour ISO 27001 (référentiel le plus utilisé)
- [ ] Seed `audit_checklist` pour ISO 27001 (~93 contrôles × 4-6 questions)

**Critères de sortie** : tous les composants existants continuent de fonctionner (legacy fields lus en fallback). Les nouvelles tables sont peuplées et accessibles via API.

### Vague 2 — Phase 4 cœur métier (~4 semaines)

**Le workspace contrôle est l'écran le plus utilisé par les auditeurs. Refonte high-impact.**

- [ ] `ControlWorkArea` en findings-centric (mode Libre prioritaire)
- [ ] Composant `FindingCard` (édition complète + drag handle)
- [ ] AI panel updated (suggestions multiples + bouton "Appliquer tout")
- [ ] `CadrageEvidencePanel` (carte forest)
- [ ] Layout 3 colonnes + flex column footer (correctif UX du bar)
- [ ] Refactor Phase 7 Action Plan pour consommer findings
- [ ] Refactor générateur PDF rapport

**Critères de sortie** : un auditeur peut produire des findings structurés, le plan d'action et le rapport sont cohérents.

### Vague 3 — Visuel & ergonomie (~3 semaines)

**Améliorations à valeur immédiate, peu de risque. Peut partir en parallèle de Vague 1.**

- [ ] Hub : phase mini-ribbon sur cards + supervision banner animé
- [ ] Phase 2 Cabinet : refonte `MissionOverviewTab` (KPI + reminder + domain + contacts + activity)
- [ ] Phase 2 Cabinet : phase tabs avec distinction active vs current-phase
- [ ] Phase 3 Planning : allègement (3 KPI / AI strip / dropdown / 6 cols / rail en onglets)
- [ ] Phase 3 Planning : multi-select bulk + risk callout actionnable
- [ ] Phase 4 Workspace : mode Guidé avec stepper 4 étapes
- [ ] Phase 4 Workspace : rail droit repliable

### Vague 4 — Phase 2 Client (~3 semaines)

**Refonte UX significative côté client. À valider avec un client pilote avant rollout.**

- [ ] Long-form questionnaire (bascule depuis le wizard actuel)
- [ ] Upload inline avec linkage `question_controls`
- [ ] Auto-création `mission_evidence_requests` à partir des questions
- [ ] Help text par question
- [ ] Bandeau gold pour conditional follow-up

### Vague 5 — Polish & nice-to-have (~3 semaines)

**Pas bloquant. Items modulaires, peut être étalé.**

- [ ] Wizard : `MissionLetterStep` (Phase 1 step 6)
- [ ] Edge function `create-letter-of-mission` (génération PDF)
- [ ] Phase 4 Workspace : onglet Discussion + table `control_comments` (Migration C)
- [ ] Phase 4 Workspace : checklist d'audit dynamique (variante du tip card)
- [ ] Phase 2 Client : délégation question-par-question
- [ ] Phase 3 Planning : modale "Voir les hypothèses" SmartPlan + Edge function

**Total estimé : 15-17 semaines** (3-4 mois) avec 1 dev + 1 designer en parallèle. Jalonnable par vague.

---

## 6. Stratégie de ship

### Vagues parallélisables

- **Vague 3 peut partir en parallèle de Vague 1** : les améliorations visuelles Hub / Phase 3 ne dépendent pas des refactors de fond
- **Vague 5 est entièrement modulaire** : item par item, sans ordre imposé
- **Vague 4 (Phase 2 client)** peut être différée tant qu'on accepte le wizard actuel pour les RSSI clients

### Vagues bloquantes

- **Vague 1 bloque Vague 2** : la Phase 4 dépend des fondations (assessment_findings + question_controls + smart-analyse refactor)
- **Vague 2 bloque le ship final** : sans findings-centric, le rapport et le plan d'action restent dans leur état actuel (textareas plats)

### Ce qui peut être différé sans casse fonctionnelle

- Lettre de mission (E) : la phase 7 continue à la générer en fin de mission
- Discussion par contrôle (C) : les chefs de mission utilisent les outils existants (mail, slack)
- Audit checklist (D) : la tip card affiche un texte générique en attendant le seed

---

## 7. Risques majeurs

### R1. Seed `question_controls` (Vague 1)

**Description** : 4 référentiels (ISO 27001, NIST CSF, PSSI-ES, COBIT) × 30-100 contrôles × 30-80 questions = travail manuel ou semi-IA. Si non fait correctement, la carte "Réponses cadrage liées" en Phase 4 est vide et l'inline upload en Phase 2 client perd sa valeur.

**Mitigation** :
- Démarrer avec ISO 27001 (le plus utilisé). Les autres référentiels peuvent rester sans linkage temporairement.
- Outil admin Gëstu pour mapper les questions ↔ contrôles, avec aide IA (LLM propose, admin valide).
- Test pilote sur 1 mission avant rollout.

### R2. Migration `assessment_findings` (Vague 1)

**Description** : les missions actives ont des assessments avec textareas remplies. La migration doit conserver tout le texte (best-effort 1 finding par assessment legacy avec textareas concaténées).

**Mitigation** :
- Script de migration idempotent et reversible.
- Phase de double-écriture : pendant 2 sprints, les nouveaux assessments écrivent dans `assessment_findings` ET les anciens textareas (lecture). Permet rollback.
- Retravail manuel par les auditeurs lors de la prochaine session sur les missions actives.

### R3. Refactor `smart-analyse` (Vague 1)

**Description** : si la fonction casse, les auditeurs perdent l'aide IA pendant le refactor. Risque de blocage métier.

**Mitigation** :
- Versionner explicitement (v1 = textes, v2 = findings[]) avec paramètre `format=v2` côté client.
- Feature flag `findings_v2` pour rollback côté UI.
- Tests sur missions de staging avant prod.

### R4. UI Phase 4 trop chargée

**Description** : le workspace contrôle accumule beaucoup d'éléments (3 colonnes, AI panel, findings cards, cadrage card, audit checklist...). Risque de cognitive overload.

**Mitigation** :
- Rail droit repliable par défaut sur écrans < 1280px
- Mode "compact" possible plus tard (toggle en topbar)
- Tests utilisateurs avec auditeurs juniors et seniors

### R5. Adoption du long-form Phase 2 client

**Description** : les RSSI clients sont habitués au wizard une-question-à-la-fois. Le long-form peut intimider.

**Mitigation** :
- Welcome banner rassurant (auto-save, peut revenir plus tard)
- Section nav rail (sticky) pour ne pas perdre le contexte
- Test pilote sur 1 client avant rollout général

---

## 8. Références

### Mockups (HTML, dossier [mockups/](mockups/))

- [handoff-1-hub-missions.html](mockups/handoff-1-hub-missions.html) — Hub
- [handoff-2-mission-create-wizard.html](mockups/handoff-2-mission-create-wizard.html) — Wizard
- [handoff-3-phase2-cabinet.html](mockups/handoff-3-phase2-cabinet.html) — Phase 2 Cabinet
- [handoff-4-phase2-client.html](mockups/handoff-4-phase2-client.html) — Phase 2 Client
- [handoff-5-phase3-planning.html](mockups/handoff-5-phase3-planning.html) — Phase 3 Planning
- [handoff-6-phase4-workspace.html](mockups/handoff-6-phase4-workspace.html) — Phase 4 Workspace

### Mémoires produit (`~/.claude/projects/.../memory/`)

- `project_question_controls_link.md` — Refactor A
- `project_findings_centric.md` — Refactor B
- `project_kpi_placement.md` — Décision KPI sur Dashboard uniquement
- `feedback_mission_create.md` — Wizard 7 steps actualisé
- `feedback_planning.md` — Phase 3 décisions visuelles + pas de due dates
- `feedback_form_selects.md`, `feedback_form_ux.md` — patterns formulaires
- `feedback_dashboard.md` — patterns dashboard
- `feedback_missions_views.md` — 3 vues Kanban/Cards/Split

### Documentation projet

- [CLAUDE.md](CLAUDE.md) — règles non négociables (TS strict, RLS, encoding...)
- [BRAND.md](BRAND.md) — charte graphique forest+gold + logo
- [README.md](README.md) — démarrage projet (si présent)

---

## Maintenance de ce document

- **Création** : 2026-05-04
- **Mise à jour** : à actualiser à chaque clôture de vague (cocher les `[ ]` → `[x]`)
- **Décommissionnement** : ce document peut être archivé une fois la Vague 5 livrée et un retour d'expérience consolidé dans CLAUDE.md
