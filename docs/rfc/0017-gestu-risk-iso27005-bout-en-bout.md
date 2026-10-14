# RFC 0017 - Gëstu Risk : gestion du risque de bout en bout (ISO/IEC 27005)

**Statut** : décisions actées (voir §11) - prêt à implémenter (Lot 1).
**Prolonge** : le module Risk existant ([[RFC 0004]], mig 00183-00197 : `risk_catalog`, `business_values`, `risk_assets`, `risk_scenarios`, `risk_control_links`, `policy_risk_links`, `incident_risk_links`, `mission_risks`), le score de confiance (facteur `risk_mastery`, mig 00159/00185), Comply (`control_assessments`, SoA implicite), Regul (`incidents`, `regulatory_measures`), la piste d'audit F6 (`activity_log`).
**Objectif** : transformer Gëstu Risk, aujourd'hui centré sur l'identification/analyse, en **outil de gestion du risque de bout en bout aligné ISO/IEC 27005:2022** (contexte -> appréciation -> traitement -> acceptation -> communication -> surveillance/revue), **sans casser le registre existant** ni le couplage au score, en boucle avec Comply et Regul.

---

## 1. État des lieux (vérifié dans le code)

Le registre tient en 8 tables + RPC de promotion. Modèle hybride **EBIOS RM** (valeurs métier / biens supports, nœud papillon) + **typologie ISO 27005** (`risk_catalog` : sources, événements redoutés, menaces).

| Brique | Rôle | État |
|---|---|---|
| `risk_scenarios` | Registre central : scénario (source/menace/événement/vulnérabilité/actif), cotation **4x4** `inherent_likelihood x inherent_impact`, `treatment` (accept/reduce/transfer/avoid/untreated), `treatment_status` (open/in_progress/done), `owner_user_id`, `due_date` | Coeur OK |
| `business_values` / `risk_assets` | Valeurs métier (couche 1) + biens supports (couche 2, 7 catégories, criticité) | OK |
| `risk_catalog` | Référentiel global EBIOS RM + ISO 27005 (lecture tous, écriture service_role) | OK |
| `risk_control_links` / `policy_risk_links` / `incident_risk_links` | Barrières (contrôle/politique, preventive/detective/corrective) + liaison incident (boucle Regul) | OK |
| `mission_risks` + RPC `promote_mission_risk` / `promote_finding` | Risques de cadrage -> promus au registre de l'org auditée | OK |
| Score | Facteur `risk_mastery` (poids 0.20), **résiduel calculé client-side, jamais persisté**, impact **off par défaut** (flag `risk_score_impact`, mode shadow) | Partiel |

Constat clé : le **résiduel et l'efficacité des barrières sont recalculés à la volée et jamais historisés** ; il n'existe aucune notion de cycle de vie, de critères configurables, ni de décision formelle (acceptation, revue).

## 2. Écarts vs un processus ISO 27005 de bout en bout

| Étape ISO 27005:2022 | Couverture actuelle | Écart à combler |
|---|---|---|
| **Établissement du contexte** | Actifs + valeurs métier | **Critères de risque configurables par org** : échelles V/I, matrice -> niveau, **seuil d'acceptation**, appétit/tolérance, périmètre |
| **Identification** | Complète (scénario) | (option) tables menaces/vulnérabilités propres à l'org (vuln = texte libre aujourd'hui) |
| **Analyse** | Inhérent 4x4 + résiduel bowtie | **Persister** le résiduel ; historiser les réévaluations |
| **Évaluation** | Seuils couleur **figés dans le code** | Comparer inhérent/résiduel au **seuil d'acceptation** paramétrable -> « dans / hors appétit », priorisation |
| **Traitement** | enum `treatment` + barrières + owner + due_date | **Plan de traitement structuré** : N actions (responsable, échéance, coût, avancement) ; justification SoA du contrôle appliqué |
| **Acceptation** | valeur `accept` seule | **Acceptation formelle** : approbateur, date, justification, **validité**, ré-acceptation au changement |
| **Communication** | aucune | Rapports (registre, cartographie, plan de traitement), notifications |
| **Surveillance / revue** | aucune | **Cadence de revue**, prochaine revue, rappels, **historisation** du niveau de risque, KRI |

## 3. Principe directeur de la refonte

1. **Additif, pas de table rasée.** Le registre `risk_scenarios` + le modèle EBIOS 2 couches + les barrières restent le coeur. On **ajoute** : la configuration des critères, le cycle de vie, le plan de traitement, l'acceptation, la revue, l'historisation.
2. **Le scénario porte un cycle de vie explicite** (statut ISO 27005), distinct du `treatment_status` (qui devient le statut du plan de traitement).
3. **Le résiduel devient une donnée de première classe** : calculé (inchangé) mais **capturé en instantanés** (snapshots) aux événements clés (évaluation, revue, changement de barrière, incident) -> historique + piste d'audit + tendance.
4. **Configurabilité par organisation** (contexte) : échelles et seuil d'acceptation paramétrables, valeur par défaut = le 4x4 actuel (non-régression totale).
5. **Boucles préservées** : Comply (contrôles = traitement, SoA), Regul (incidents = risque réalisé), score (`risk_mastery`), piste d'audit (`risk.*`).

## 4. Établissement du contexte - critères de risque (nouveau)

**`risk_criteria`** (1 ligne par organisation, défaut seedé = 4x4 actuel) :
- `organization_id` (unique), `likelihood_scale jsonb` (niveaux + libellés + bornes), `impact_scale jsonb`, `matrix jsonb` (cellule V x I -> niveau faible/moyen/élevé/critique), `acceptance_threshold` (niveau au-dessus duquel le traitement est **obligatoire**), `appetite_statement text`, `tolerance_by_dimension jsonb?`, `review_default_months int` (cadence de revue par défaut).
- Les constantes figées (`RISK_LIKELIHOOD_LEVELS`, seuils couleur `constants.ts:405-451`) deviennent le **fallback** quand aucune ligne org n'existe -> dégradation gracieuse.

> Reste 4x4 par défaut (décision D1) ; la configurabilité porte d'abord sur **libellés + seuil d'acceptation + cadence**, pas sur la taille de matrice (évite une explosion de combinatoires UI en v1).

## 5. Appréciation - évaluation vs critères (extension)

- `risk_scenarios` gagne un **statut de cycle de vie** `lifecycle_status` : `identified | analysed | evaluated | treatment_planned | in_treatment | residual_accepted | monitored | closed` (+ `reopened`). Défaut `identified` ; migration backfill des existants selon l'état (coté -> `analysed`, barrières -> `treatment_planned`, etc.).
- L'évaluation compare le **niveau résiduel** (ou inhérent si pas de traitement) au `acceptance_threshold` -> drapeau `is_above_appetite` (calculé). Priorisation du registre par dépassement d'appétit puis exposition.
- **Exigence par étape (saisie progressive).** À la création, seuls **intitulé + dimension + cotation V/I** sont requis (contrainte NOT NULL + défauts) ; tous les autres champs (source, menace, vulnérabilité, bien support, valeur métier, événement redouté, propriétaire, échéance) restent **optionnels**. La complétude est exigée **par transition de statut**, pas à la création : `analysed` requiert la cotation + l'actif ou l'événement redouté ; `treatment_planned`/`in_treatment` requiert un propriétaire + au moins une action ou barrière ; `residual_accepted` requiert une acceptation active. La validation de passage d'étape vit côté edge/RPC (serveur). UI : formulaire de **création rapide (3 champs)**, champs optionnels repliés, **jauge de complétude** et enrichissement différé (évite les registres vides par friction de saisie).

## 6. Traitement - plan structuré (nouveau)

**`risk_treatment_actions`** (N actions par scénario) :
- `risk_scenario_id`, `organization_id`, `description`, `option` (reduce/transfer/avoid/accept - hérite du scénario), `owner_user_id`, `due_date`, `status` (todo/in_progress/done/cancelled), `cost_estimate numeric?`, `control_id?` (action = mise en oeuvre d'un contrôle Comply -> **lien SoA**), `created_by`, timestamps.
- **Demandes d'action du régulateur (directives).** Une action peut être d'**origine superviseur** : `origin` (`internal | supervisor_directive`), `requested_by` (régulateur), `verification_status` (`pending | verified | rejected`), `verified_by`, `verified_at`. Cycle : le régulateur **demande** -> l'assujetti **réalise** (met `status=done`) -> le régulateur **vérifie** (`verified`/`rejected`). Suivi des retards et des demandes à vérifier côté régulateur (écran « Suivi des demandes »). **Même table, pas de fork ; côté assujetti, surface = le portail client existant** (réutiliser le pattern `ClientActionPlanTab` / demandes de preuve, cf. §10bis), pas de nouvelle interface.
- `treatment_status` du scénario devient **dérivé** de l'avancement des actions (ou conservé comme résumé).
- **SoA** : `risk_control_links` gagne `applicability_justification text?` (pourquoi ce contrôle traite ce risque) -> alimente une Déclaration d'Applicabilité exportable (pont ISO 27001 Annexe A).

> Décision D2 : table dédiée **plutôt que** réutiliser `corrective_action_requests` (CAR = niveau mission ; le traitement du risque est niveau org et vit hors mission). Un pont optionnel CAR<->action reste possible plus tard.

## 7. Acceptation formelle du risque (nouveau)

**`risk_acceptances`** :
- `risk_scenario_id`, `organization_id`, `residual_level` (instantané au moment de l'acceptation), `accepted_by` (propriétaire du risque / approbateur), `accepted_at`, `justification text`, `valid_until date?`, `status` (`active | expired | revoked | superseded`), `created_by`.
- Règle : passer `lifecycle_status` à `residual_accepted` exige une acceptation `active`. Toute **hausse matérielle du résiduel** (nouvel incident, barrière retirée, re-cotation) **invalide** l'acceptation (`superseded`) et re-ouvre la revue (trigger).
- Autorisation : propriétaire du risque, ou **permission dédiée** `can_accept_risk` (décision D3). Jamais un rôle `client` sauf édition réflexive Entreprise.

## 8. Surveillance & revue + historisation (nouveau)

- `risk_scenarios` gagne `next_review_at`, `last_reviewed_at`, `review_frequency_months` (défaut = `risk_criteria.review_default_months`).
- **`risk_reviews`** : journal de chaque revue (`risk_scenario_id`, `reviewed_by`, `reviewed_at`, `decision` (maintain/retreat/accept/close), `residual_level`, `notes`). Alimente les rappels (revues en retard).
- **`risk_snapshots`** : instantané du niveau (`risk_scenario_id`, `captured_at`, `inherent_level`, `residual_level`, `treatment_status`, `trigger` (evaluation/review/control_change/incident)) -> **tendance** + preuve dans la piste d'audit. Écrits par trigger/RPC, jamais à la main.
- **KRI** (v1.1) : indicateurs dérivés (nb risques hors appétit, résiduel moyen, revues en retard, incidents liés) exposés au dashboard.

## 9. Communication & reporting (nouveau)

- **Tableau de bord risque** (étend `RiskPage`) : hors-appétit, plan de traitement (avancement), revues dues, tendance résiduel, top expositions.
- **Exports** : registre (CSV/PDF), **Déclaration d'Applicabilité** (contrôles x risques traités), plan de traitement, rapport de management.
- **Notifications** : revue en retard, acceptation expirée, action de traitement échue, incident aggravant (réutilise le canal notifications existant).
- **Regul** : la vue agrégée par assujetti (`get_audited_org_risks`) gagne les mêmes signaux (hors-appétit, revues dues) en lecture seule.

## 10. Intégration (les boucles, renforcées)

- **Comply -> Risk** : `control_assessments.conformity_level` = efficacité des barrières -> résiduel (déjà là). Nouveau : justification SoA, et une action de traitement peut **cibler un contrôle** à faire évaluer.
- **Risk -> Comply** : les risques **hors appétit** pondèrent le SmartPlan (auditer d'abord ce qui expose le plus) - RFC 0004 §6, à implémenter.
- **Regul -> Risk** : `incidents` aggravent la vraisemblance (déjà) ; `regulatory_measures` = signal de risque réalisé -> re-cotation + invalidation d'acceptation.
- **Risk -> Score** : **différé** (décision D4). La refonte ne touche pas au score de confiance pour l'instant ; le couplage `risk_mastery` existant reste en shadow, inchangé. Le résiduel persisté (snapshots) servira à le fiabiliser quand ce chantier sera rouvert.
- **Piste d'audit F6** : nouvelles familles `risk.*` (cotation, traitement, acceptation, revue) scellées dans `activity_log`.

## 10bis. Adaptation par édition (RFC 0013)

Le module Risque se résout **par capacités** (comme le reste de la plateforme), sans fork. L'édition du client détermine nav, posture, droits et vocabulaire :

| Édition | Capacité distinctive | Posture Risque | Droits | Vocabulaire |
|---|---|---|---|---|
| **Entreprise** (réflexive, `client_id = cabinet_id`) | ni `supervision` ni `client_portal` | gère **son propre** registre de bout en bout ; pas de notion de mission/client | CRUD complet sur sa propre org | « mon organisation » |
| **Cabinet** | `client_portal` | registre **par client/mission** ; **promotion** des constats et risques de cadrage vers le registre du client | CRUD sur le registre du client (contexte mission) | « client » |
| **Régulateur** | `supervision` (+ `client_portal` pour les assujettis) | **supervision active** : agrégation par assujetti + **demandes d'action de traitement** + suivi/vérification de réalisation + critères sectoriels / risques systémiques | **écriture de supervision** sur le registre des assujettis (gérer, demander, vérifier) ; la saisie interne reste faite par l'assujetti via son portail | « assujetti » |

- **Le régulateur n'est PAS en lecture seule.** Il suit que les risques des assujettis sont bien traités et à jour : il peut gérer leurs risques, **émettre des demandes d'action de traitement** (échéance, suivi, **vérification de clôture**), et relancer. L'assujetti remplit son registre et **répond via son portail** ; le régulateur vérifie. Modèle collaboratif régulateur <-> assujetti, analogue à cabinet <-> client mais avec autorité de supervision.
- **Capitalisation sur le portail existant (ne pas réinventer).** Les assujettis Regul ont **déjà** le portail client (`src/features/client-portal` : `ClientMissionDetailPage`, onglet plan d'action `ClientActionPlanTab`, `client_mission_access`, flux de demande/réponse type demande de preuve). La partie Risque **réutilise ce portail** : les demandes d'action de traitement y apparaissent et s'y traitent (même pattern que le plan d'action / les demandes de preuve existantes), **sans nouvelle interface assujetti**. Seule une section « Risques / Demandes » peut être ajoutée à la coque portail existante.
- Résolution via les mêmes helpers que `moduleRegistry` / `missionHasClientPortal` : la vue régulateur et le suivi des demandes n'apparaissent que sous `supervision`.
- Vocabulaire via les presets d'édition (RFC 0013). **Aucune divergence de schéma** : une seule base de code, affordances ouvertes par capacité (les tables et RLS org-scoped restent identiques ; l'écriture cross-tenant du superviseur passe par un canal dédié, cf. §6 et §13).

## 11. Décisions actées

- **D1 - Critères de risque** -> **4x4 fixe** ; configurables par org : **seuil d'acceptation + libellés + cadence de revue** (pas la taille de matrice). Défaut = le 4x4 actuel.
- **D2 - Plan de traitement** -> **table dédiée `risk_treatment_actions`** (niveau org) ; une action peut cibler un contrôle Comply (lien SoA). Pont CAR reporté.
- **D3 - Acceptation** -> **permission dédiée `can_accept_risk`**, portée par défaut par le propriétaire du risque ; jamais un rôle `client` (hors édition réflexive).
- **D4 - Impact score** -> **couplage au score de confiance DIFFÉRÉ** (décision 2026-10-14). La refonte n'intègre rien au score Gëstu pour l'instant : le facteur `risk_mastery` existant reste tel quel (shadow, inchangé), on ne l'étend pas et on ne le sort pas du shadow. À rouvrir une fois le cycle de vie en place.
- **D5 (défaut)** - Menaces/vulnérabilités : **menace = catalogue, vulnérabilité = texte** en v1 ; tables org dédiées en v1.1.
- **D6 (défaut)** - Portée Regul : le **cycle complet est disponible à toute org** portant la capacité `risk` (y compris assujetti, via org-scoping) ; le **régulateur conserve l'agrégation cross-tenant en lecture seule** (`get_audited_org_risks`). Réversible.

## 12. Découpage de livraison

| Lot | Contenu | Dépend de |
|---|---|---|
| **1 - Contexte & évaluation** | `risk_criteria` (+ défaut 4x4), `lifecycle_status` sur `risk_scenarios`, drapeau hors-appétit, backfill | - |
| **2 - Traitement & SoA** | `risk_treatment_actions`, `applicability_justification`, `treatment_status` dérivé, export SoA | Lot 1 |
| **3 - Acceptation** | `risk_acceptances` + règles d'invalidation (triggers) + permission `can_accept_risk` | Lot 1 |
| **4 - Revue & historisation** | `next_review_at`/`review_frequency`, `risk_reviews`, `risk_snapshots` (triggers), rappels | Lot 1 |
| **5 - Communication** | dashboard enrichi, exports, notifications ; vue Regul enrichie | Lots 1-4 |
| **6 - Boucles & audit** | SmartPlan pondéré risque, familles `risk.*` piste d'audit (couplage score **différé**, D4) | Lots 1-4 |

Chaque lot : branche feat -> staging (snayz) -> PR main (gate) ; gates `typecheck` / `check:entities` / `check:accents` / `build` ; migrations up/down.

## 13. Sécurité / RLS

- Toutes les nouvelles tables **org-scoped** sur le patron existant : `organization_id = get_my_organization_id() and not is_client_role()` + policy RESTRICTIVE `is_aal2()` (helpers SECURITY DEFINER, **pas de récursion**).
- Écritures sensibles (acceptation, snapshots, invalidation) via **triggers/RPC SECURITY DEFINER** `search_path=''` ou edge service_role ; jamais de confiance client.
- Cloisonnement Regul : **lecture** cross-tenant via `get_audited_org_risks` / sous-arbre (`get_subsidiary_ids`). **L'écriture de supervision** (créer une demande d'action, vérifier une clôture, annoter un risque d'un assujetti) passe par une **edge/RPC SECURITY DEFINER dédiée** qui vérifie la **relation de supervision** régulateur -> assujetti (jamais d'écriture RLS directe cross-org) et la journalise (`risk.directive.*`). L'assujetti, lui, écrit son propre registre via son portail (RLS org-scoped habituelle, `can_accept_risk` jamais donné au portail sauf édition réflexive).
- Acceptation réservée au staff habilité (`can_accept_risk`), jamais `client` (sauf édition réflexive).
- Journalisation `risk.*` dans `activity_log` (chaîne de hash par org, F6).

## 14. Non-régression (garanties)

- `risk_criteria` absente -> fallback aux constantes 4x4 actuelles (comportement identique).
- `lifecycle_status` par défaut rétro-calculé ; les écrans actuels (registre, bowtie, simulateur) continuent de fonctionner.
- `treatment_status` conservé (résumé) même devenu dérivé.
- Score : `risk_mastery` reste en shadow tant que le flag n'est pas activé par org ; registre vide -> neutre.
- Résiduel toujours calculable client-side (simulateur inchangé) ; les snapshots sont additifs.

## 15. Hors scope (v1)

- **Couplage au score de confiance Gëstu (facteur `risk_mastery`) : différé** (décision 2026-10-14). La refonte n'y touche pas ; le couplage shadow existant reste inchangé. À rouvrir ultérieurement en s'appuyant sur le résiduel persisté.
- Quantification monétaire du risque (VaR, ALE/SLE) - possible en v1.1 via `cost_estimate` et scénarios chiffrés.
- Matrices de taille variable (D1-b).
- Tables menaces/vulnérabilités org (D5-b).
- Intégration MITRE ATT&CK (extension `risk_catalog` ultérieure, cf RFC 0004 D3).
