# RFC 0003 — Deux moteurs de mission sélectionnables par organisation

> Statut : **BROUILLON à co-définir puis valider** avant tout code.
> Date : 2026-08-14. Lié à [[RFC 0001]] (graphe d'org) et [[RFC 0002]] (éditions & capacités).
> Objectif : permettre au **superadmin** de choisir, **pour une organisation**, une **version du moteur de mission** (les étapes du cycle de vie + le fonctionnement interne des étapes) — typiquement un « Audit complet » (Comply) et un « Contrôle » (Regul).

---

## 1. Décisions de cadrage déjà prises

- **Sélection** : par **organisation**, côté **superadmin**.
- **2ᵉ moteur (Contrôle/Regul)** : l'assujetti **ne valide pas** les contrôles, mais **peut laisser des remarques** dessus (sans que ce soit une validation formelle).
- **Simplifier le fonctionnement à l'intérieur de certaines étapes** (pas seulement la liste des étapes).
- **Méthode** : ce doc de conception d'abord ; on **définit les deux moteurs ensemble** ici.

---

## 2. État des lieux (résumé des traces)

- **Un seul moteur aujourd'hui**, partagé Comply/Regul : enum Postgres `mission_status` **figé à 7 valeurs** (`initialization, scoping, planning, fieldwork, internal_review, client_review, closure`), et une **même** `MissionDetailPage` (routes `/missions/:id` ET `/controles/:id`).
- **Embryon de moteur variable déjà présent** : `mission-constants.ts` définit `MISSION_PHASES` **et** `CONTINUOUS_SUPERVISION_PHASES` (retire « Validation client », renomme « Clôture »), choisis par `getMissionPhases(mission.kind)` (`kind ∈ {audit, continuous_supervision}`). Le stepper itère sur ce tableau.
- **Le trigger de transitions (mig 00148) autorise déjà `internal_review → closure`** (saut de la validation client).
- **« Remarques non bloquantes » : DÉJÀ construit** — table `assessment_observations` (mig 00061), littéralement *« le client peut poster des observations non bloquantes sur les constats ; l'auditeur y répond (modifié/conservé) »*. Insert réservé au client **contributeur**, RLS en place.
- **Validation bloquante = `client-review-assessment`** (edge) : l'**approbateur** approuve/rejette chaque contrôle, un rejet le renvoie en `draft`. Bornée à `mission.status = 'client_review'`. **C'est cette étape que le moteur Contrôle retire.**
- **Frictions** : transitions **décentralisées** (REST brut, RPC, update direct, edge — pas de fonction unique « avancer ») ; **libellés d'étapes dupliqués dans 5 fichiers** non synchronisés, dont Regul **incohérent** (clé fantôme `review`, labels manquants).

---

## 3. Définition des deux moteurs (le cœur — à valider)

### Moteur 1 — « Audit complet » (défaut Comply)
Inchangé : `Cadrage → Planification → Travaux → Revue interne → **Validation client** → Clôture`.
L'assujetti **valide** (approbateur : approuve/rejette chaque contrôle, blocant).

### Moteur 2 — « Contrôle » (défaut Regul) — PROPOSITION
`Cadrage (simplifié) → Planification → Travaux → Revue → Clôture` — **5 étapes, pas de « Validation client »**.

- **Pas de validation approbateur** : on retire l'étape `client_review`. La mission passe `Revue (internal_review) → Clôture` (déjà légal en base).
- **Remarques de l'assujetti, non bloquantes** : on **réutilise `assessment_observations`** (aucune table nouvelle). L'assujetti reçoit un accès **contributeur** (pas approbateur) sur les contrôles ; il peut commenter, l'auditeur répond et décide (modifié/conservé). **Aucun gate**, la progression ne dépend pas des remarques.
- **« Revue »** = l'actuelle `internal_review` renommée (côté contrôleur : consolidation avant clôture, en tenant compte des remarques de l'assujetti).

### Simplifications intra-étapes pour le Moteur 2 (VALIDÉ 2026-08-14)

| Étape | Contenu actuel | Moteur 2 « Contrôle » |
|---|---|---|
| **Cadrage** | 5 sous-onglets : Périmètre, Risques, Acteurs, Documents, Questionnaire (+ IA, invitation portail, import organigramme) | **Périmètre + Acteurs + Documents**. Onglet **Risques retiré**. **Questionnaire optionnel** (non requis pour avancer). |
| **Travaux** | Étapes guidées Observer → Documenter → Analyser → Validation (+ panneau IA) par contrôle | **Formulaire d'évaluation direct** par contrôle (conformité + constat) **par défaut** ; les **étapes guidées restent disponibles** (optionnelles) si le contrôleur les active. |
| **Revue** | Kanban de validation interne | Inchangé. |
| **Clôture** | Rapport + plan d'action | Inchangé. |

---

## 4. Architecture proposée (le « comment »)

1. **Où vit le choix** : nouvelle colonne `organizations.workflow_version text not null default 'audit'` (miroir de `organizations.edition`, RFC 0002). C'est le **défaut des nouvelles missions** de l'org.
2. **Snapshot par mission (clé pour la sûreté)** : à la **création**, la mission fige son moteur (`missions.workflow_version`, dérivé de l'org). → Changer le moteur d'une org **n'impacte pas les missions en cours** (pas de mission bloquée dans un statut absent du nouveau moteur). Le runtime lit **le moteur de la mission**, pas la valeur courante de l'org.
3. **Résolveur data-driven** : généraliser `getMissionPhases()` pour qu'il prenne le **moteur de la mission** (et non plus seulement `kind`). Définir les moteurs comme **données** (`WORKFLOW_ENGINES: { audit: [...], controle: [...] }`). Le stepper est déjà data-driven → peu de changement.
4. **Source unique des libellés** : centraliser les labels d'étapes (supprime la duplication des 5 fichiers et corrige l'incohérence Regul). `useVocab` peut renommer si besoin (ex. « Contrôle » au lieu de « Mission »).
5. **Rendu conditionnel intra-étapes** : les sous-onglets/étapes-guidées s'affichent selon le moteur de la mission (ex. masquer « Validation client », alléger « Cadrage »). `MissionDetailPage` reste une cascade mais ne rend que les onglets du moteur.
6. **Transitions** : les 2 moteurs restant des **sous-ensembles des 7 statuts**, le trigger 00148 couvre déjà `internal_review→closure`. Paramétrer les adjacences autorisées **par moteur** si besoin (sinon inchangé). Pas de migration d'enum.
7. **Sélection superadmin** : edge `admin-set-org-engine` calquée sur `admin-update-organization` (garde `requirePlatformOwner`, whitelist des moteurs, `logAdminAction` + `activity_log`), pilotée par un nouvel onglet « Moteur » dans `CabinetDetailPage`.

**Ce qu'on NE fait PAS** (hors périmètre v1) : moteurs à étapes entièrement nouvelles (migration enum→table de config + machine à états). Réservé à une v2 si un besoin réel de stages inédits émerge.

---

## 5. Volet sécurité / impact

- **Sélection superadmin uniquement** (`requirePlatformOwner`), journalisée (admin_audit_log + [[piste d'audit]] activity_log).
- **Snapshot par mission** → aucune mission en cours cassée par un changement de moteur.
- **Remarques assujetti** : réutilisent `assessment_observations` + `client_mission_access.permission = 'contributor'`, RLS existante (pas de nouvelle surface). L'edge de validation bloquante (`client-review-assessment`, approbateur) **reste** pour le Moteur 1.
- **Aucune migration d'enum** → pas de risque sur les données existantes ; les missions actuelles = moteur `audit` par défaut.
- Régression à surveiller : la centralisation des libellés touche 5 fichiers d'affichage (dont listes Comply/Regul) — tests visuels.

---

## 6. Découpage de livraison proposé (après validation)

1. **Fondation données** : `organizations.workflow_version` + `missions.workflow_version` (snapshot au create) + backfill (`audit` partout ; `controle` pour les orgs à capacité `supervision` si tu le souhaites).
2. **Résolveur + labels** : `WORKFLOW_ENGINES` data-driven, source unique des libellés, `getMissionPhases(mission)`.
3. **Moteur Contrôle — étapes** : masquer `client_review`, brancher les remarques assujetti (contributeur) sur le portail.
4. **Moteur Contrôle — intra-étapes** : simplifications validées (Cadrage/Travaux…).
5. **Superadmin** : edge + onglet « Moteur » dans `CabinetDetailPage`.
6. Nettoyage : incohérence labels Regul, timeline portail dupliquée.

Chaque étape : snayz → validation → prod.

---

## 7. Décisions (verrouillées 2026-08-14)

- **D1 — Étapes Moteur 2** : ✅ **5 étapes** (Cadrage → Planification → Travaux → Revue → Clôture).
- **D2 — Intra-étapes** : ✅ Cadrage = Périmètre + Acteurs + Documents (Risques retiré, Questionnaire optionnel) ; Travaux = formulaire direct par défaut + **étapes guidées optionnelles** ; Revue/Clôture inchangées.
- **D6 — Attribution** : ✅ **libre par org**, choisie par le superadmin, **symétrique** : aucun moteur (`audit` NI `controle`) n'est dérivé de l'édition/capacité. Le moteur d'une org = uniquement la valeur posée par le superadmin (une org Comply peut être en `controle`, une org Regul en `audit`).
- **D3 — Remarques assujetti** : ✅ **Modèle B — consultation contradictoire à la Revue**. Le contrôleur **ouvre** une consultation (non bloquante) à l'étape Revue ; l'assujetti (accès **contributeur**) laisse ses remarques par contrôle dans l'onglet **Résultats** du portail ; le contrôleur y répond et décide (modifié/conservé) puis clôture. Réutilise `assessment_observations`. Non bloquant (les remarques n'empêchent pas la clôture).
- **D4 — Nommage** *(défaut retenu)* : moteurs `audit` (« Audit complet ») et `controle` (« Contrôle ») ; libellés d'étapes renommables par org via `useVocab` en phase ultérieure.
- **D5 — Rapport à `kind`** *(défaut retenu)* : le moteur (`workflow_version`) est l'**axe primaire** ; `kind` (audit / supervision continue) **coexiste** comme sous-cas du moteur `audit`. Le résolveur = f(workflow_version, kind).
- **D7 — Backfill** : ✅ **Aucun auto-basculement** (principe symétrique de D6).
  - **Missions existantes** → toutes `audit` (sécurité : jamais de mission en cours bloquée dans un statut absent du nouveau moteur). Seules les **nouvelles** missions prennent le moteur de leur org (snapshot au create).
  - **Organisations existantes** → toutes `audit` (valeur neutre initiale). Le superadmin bascule explicitement une org sur `controle` (ou la garde en `audit`) via l'onglet « Moteur ». Une seule bascule manuelle pour DCSSI.
