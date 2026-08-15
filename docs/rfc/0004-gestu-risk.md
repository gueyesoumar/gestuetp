# RFC 0004 — Gëstu Risk (couche d'exposition du score de confiance)

> Statut : **BROUILLON à valider** avant tout code.
> Date : 2026-08-14. Lié à [[RFC 0001]] (graphe d'org), [[RFC 0002]] (éditions), [[RFC 0003]] (moteurs), et au **modèle de score de confiance** (6 dimensions + 3 facteurs, mig 00159).
> Objectif : livrer **Gëstu Risk** — le registre de risques qui apporte l'**exposition** manquante et **ré-alimente le score de confiance** (posture → confiance ajustée au risque), en faisant boucle avec Comply et Regul.

---

## 1. Décisions de cadrage (verrouillées 2026-08-14)

- **Périmètre v1 = complet** : registre + inhérent/résiduel + radar + **branchement sur le score** + **simulateur « et si »** + **nœud papillon**.
- **Cotation = qualitatif 4×4** (Vraisemblance × Impact, 4 niveaux), aligné sur la criticité **IIC** déjà en place.
- **Portée = registre PAR ORGANISATION, alimenté par les missions** (`mission_risks` y remontent) ; côté Regul, vue agrégée par assujetti.

---

## 2. État des lieux (traces)

- **Score de confiance** calculé **côté client** dans `src/features/hub/useSelfDimensionScores.ts` : pour chaque dimension, axe = `approved/total` des `control_assessments` (jointure `controls.dimension`, mig 00159). `composite_posture = moyenne(axes mesurés)`. **3 facteurs** (`human_factor`, `third_party` mappés + `assurance` calculé) tempèrent via un **coefficient conservateur** : `coefficient = produit(1 − w·(1 − score/100))`, plancher **0.5** ; `composite = round(posture × coefficient)`. Poids : human 0.15, third_party 0.15, assurance 0.20 (`constants.ts`). **Pas encore de table serveur** de scores (Phase B différée).
- **`controls.dimension`** (score_dimension) : chaque contrôle porte sa dimension (ai/inherited/manual) → c'est le pont Comply→score.
- **`mission_risks`** (mig 00038) : risques identifiés au **cadrage** d'une mission (`title`, `risk_level` enum critical/high/medium/low, `description`, `domain_ids[]`, `source`). RLS par équipe de mission. **Niveau mission uniquement**, non relié au score.
- **Regul** : `incidents` + `regulatory_measures` (actes gradués) — signaux de risque réalisé, aujourd'hui non reliés au risque.

---

## 3. Modèle de données v1 — EBIOS RM (2 couches) + catalogue normalisé

### 3.1 Référentiel normalisé (seedé, plateforme)
- **`risk_catalog`** — bibliothèque SEEDÉE depuis **EBIOS RM + typologie ISO 27005**, partagée (lecture pour tous, écriture super-admin) : `id, kind (source_de_risque | evenement_redoute | menace_type), code, label, framework (ebios_rm | iso_27005), description`. Alimente le nœud papillon (menaces / événements redoutés).

### 3.2 Modèle EBIOS 2 couches (org-scoped)
- **`business_values`** — **valeurs métier** (couche 1 EBIOS) : `id, organization_id, name, description, dimension?, criticality (IIC)`.
- **`risk_assets`** — **biens supports** (couche 2 EBIOS) : `id, organization_id, name, category (application|data|infrastructure|third_party|process|people|site), criticality (IIC), business_value_id? (le bien support porte une valeur métier), entity_id? (rattachement Regul), description`.
- **`risk_scenarios`** — le registre : `id, organization_id, title, description, dimension (score_dimension), business_value_id?, asset_id?, source_ref? (→risk_catalog source), feared_event_ref? (→risk_catalog événement), threat_ref? (→risk_catalog menace), vulnerability, inherent_likelihood (1..4), inherent_impact (1..4), treatment (accept|reduce|transfer|avoid|untreated), treatment_status (open|in_progress|done), owner_user_id?, due_date?, source_mission_id?, source_risk_id? (lien mission_risks), created_by, timestamps`.
  - **Résiduel non stocké** : dérivé (§4) de l'efficacité des contrôles-barrières. Override manuel optionnel possible.
- **`risk_control_links`** — barrières (nœud papillon + pondération) : `risk_scenario_id, control_id, kind (preventive|detective|corrective)`. N:N scénario ↔ contrôle Comply.
- **Traitement** : réutilise les **plans d'action** existants (corrective_action_requests) quand c'est une mission ; sinon action légère sur le scénario.

### 3.3 Lien avec l'existant
- **`mission_risks` → registre** : un risque de cadrage est **promu** en `risk_scenario` (`source_risk_id`). Le registre org = source de vérité permanente ; les missions l'alimentent.
- **Cotation 4×4** : `exposure = f(likelihood, impact)` sur 0..100 (ex. `(L·I)/16·100`), palier IIC = quadrant haut-droit. Échelle centralisée dans `constants.ts` (`RISK_LIKELIHOOD_LEVELS`, `RISK_IMPACT_LEVELS`).

---

## 4. Branchement sur le score (le cœur)

**Principe : ne pas créer un second score. Ré-alimenter le modèle existant (6+3), dans son esprit conservateur (les signaux tempèrent, ne gonflent jamais).**

1. **Efficacité par dimension** = l'axe posture actuel (`approved/total` des contrôles de la dimension). Inchangé.
2. **Exposition inhérente par dimension** = agrégat (max pondéré) des `risk_scenarios` de cette dimension → 0..100.
3. **Résiduel par dimension** = `inhérent × (1 − efficacité/100)`. Fort inhérent + faible efficacité = résiduel élevé. (Si des `risk_control_links` existent, l'efficacité est celle des contrôles-barrières liés, plus fine.)
4. **Nouveau facteur `risk_mastery`** (transverse, comme `assurance`) : `score = 100 − moyenne(résiduel pondéré par la criticité des actifs)`. Il **tempère** le composite via le coefficient existant (poids **0.20** = `assurance`, plancher 0.5 conservé). Zéro résiduel → aucune pénalité ; résiduel massif → le composite chute.
   - Intégration : **étendre `useSelfDimensionScores`** pour charger le registre, calculer résiduel + `risk_mastery`, et l'ajouter au tableau `factors` (coefficient, plancher inchangés).
   - **Activation « shadow » derrière un flag org** (`risk_score_impact`, via `feature_flag_overrides`) : `risk_mastery` est calculé et **affiché** (radar/simulateur) mais **ne pèse pas** sur le composite tant que le super-admin ne l'active pas pour l'org — évite la « vallée » de saisie (registre à moitié rempli). Dégradation gracieuse : registre vide → `risk_mastery = null` → neutre.
5. **Radar tri-couche** : le radar affiche par dimension **inhérent (halo) / posture (trait) / résiduel (rempli)** — l'écart trait↔rempli = le risque non maîtrisé.
6. **Boucle Regul** : un `incident` déclaré ↑ `inherent_likelihood` du scénario associé (trigger/edge) → résiduel ↑ → score ↓, automatiquement.

> *Réservé v1.1* : pondération FINE de chaque axe par le risque couvert (remplacer `approved/total` par une moyenne pondérée-risque). En v1 on garde l'axe posture + le facteur `risk_mastery`, plus simple et non invasif, qui délivre déjà la « confiance ajustée au risque ».

---

## 5. UX v1 (les 4 gestes signature, tous inclus)

- **Registre** : liste/table des scénarios (dimension, actif, inhérent, résiduel, traitement), filtrable.
- **Carte de risque vivante** : matrice 4×4 Vraisemblance×Impact, bulles colorées par dimension, taille = résiduel.
- **Nœud papillon** (clic sur un risque) : menaces → vulnérabilité → **actif** → impacts, avec les **contrôles Comply comme barrières** (`risk_control_links`).
- **Radar tri-couche** : inhérent/posture/résiduel sur les 6 dimensions.
- **Simulateur « et si »** : curseurs (couverture de traitement / efficacité d'un contrôle) → **recalcul client-side** du résiduel et du composite (via `risk_mastery`) → le cadran de confiance et le radar bougent en temps réel. Zéro écriture ; pur calcul sur le registre chargé.

---

## 6. Écosystème (les boucles)

- **Comply → Risk** : `controls` + `conformity_level` alimentent l'efficacité (réduction du risque). Les `risk_control_links` matérialisent les barrières.
- **Risk → Comply** : les risques prioritaires **pondèrent le SmartPlan** (on audite d'abord ce qui expose le plus).
- **Regul → Risk** : `incidents`/`regulatory_measures` = risque réalisé → mise à jour de la vraisemblance + revue du scénario.
- **Risk → Regul** : cartographie IIC pondérée par le résiduel (vue régulateur agrégée par assujetti).
- **Transverse** : plans d'action existants pour le traitement ; [[piste d'audit]] pour tracer les cotations/traitements.

---

## 7. Volet sécurité / impact

- **RLS org-scoped** stricte sur `risk_assets/scenarios/links` (`organization_id = get_my_organization_id()`, pas de récursion, helpers SECURITY DEFINER) + AAL2 (RESTRICTIVE, standard plateforme).
- **Impact score** : ajouter `risk_mastery` fera **baisser le composite** des orgs exposées (c'est le but), mais c'est un **changement de sémantique du score** → à communiquer/piloter (feature-flag possible le temps de peupler les registres, pour éviter un score qui s'effondre sur un registre vide → dégradation gracieuse : `risk_mastery = null` si aucun scénario, donc neutre, comme les autres facteurs).
- **Cloisonnement Regul** : la vue agrégée par assujetti passe par le sous-arbre (`get_subsidiary_ids`), jamais d'accès cross-org.
- Journalisation des cotations/traitements dans la piste d'audit (nouvelles familles `risk.*`).

---

## 8. Découpage de livraison proposé

1. **Données** : `risk_catalog` (seed EBIOS RM + ISO 27005), `business_values`, `risk_assets`, `risk_scenarios`, `risk_control_links` + RLS org-scoped + AAL2 + lien `mission_risks` ; constantes cotation 4×4. Flag `risk_score_impact`.
2. **Score** : étendre `useSelfDimensionScores` (résiduel + facteur `risk_mastery` 0.20, dégradation gracieuse) — **shadow** derrière le flag.
3. **UX registre + carte de risque** (matrice) + radar tri-couche.
4. **Nœud papillon** + **simulateur « et si »**.
5. **Boucles** : SmartPlan pondéré risque (Comply), incident→vraisemblance (Regul), promotion `mission_risks`→registre.
6. Module dans le Hub (produit Risk activé) + nav.

Chaque étape : snayz → validation → prod.

---

## 9. Décisions (verrouillées 2026-08-15)

- **Périmètre v1** : ✅ complet (registre + inhérent/résiduel + radar tri-couche + branchement score + **simulateur** + **nœud papillon**).
- **Cotation** : ✅ **qualitatif 4×4** (aligné IIC).
- **Portée** : ✅ **registre org, alimenté par les missions** ; vue Regul agrégée par assujetti.
- **D1 — Poids `risk_mastery`** : ✅ **0.20** (= assurance).
- **D2 — Bascule score** : ✅ **flag org `risk_score_impact`, mode « shadow » par défaut**, activation super-admin.
- **D3 — Nœud papillon** : ✅ **bibliothèque normalisée** — **EBIOS RM + typologie ISO 27005** (`risk_catalog` seedé). MITRE ATT&CK en extension ultérieure.
- **D4 — Actifs** : ✅ **modèle EBIOS 2 couches** — `business_values` (valeurs métier) + `risk_assets` (biens supports).
