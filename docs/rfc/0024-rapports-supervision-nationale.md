# RFC 0024 - Rapports de supervision nationale (rapport au Président)

> Statut : **proposition (cadrage, avant tout code)**. Maquette d'aperçu validée, décisions §10 actées.
> Fondé sur : [[RFC 0021]] (moteur de rendu react-pdf + templates par client), [[RFC 0017]] (Gëstu Risk ISO 27005), [[RFC 0003]] (moteurs de mission audit/contrôle), [[RFC 0013]] (éditions et capacités).
> Réutilise : `get_supervised_org_portfolio` (00317/00325), `get_supervised_risks`, `get_regulator_action_tracking` (00352/00354), `assessment_findings` (00099), `regulatory_measures` (00354), `risk_scenarios` / `risk_acceptances` (00313) / `risk_reviews`, `entity_regulatory_profile` (IIC, 00325), `activity_log` (piste d'audit, F6).
> Maquette : « Rapport au Président » (couverture institutionnelle, lettre de transmission, synthèse, volets Regul/Risk approfondis, lecture croisée, décisions, annexes).
> Édition : régulateur (capacité `supervision`) uniquement.

---

## 1. Problème

Le régulateur dispose de toutes les données de supervision (conformité, mesures, exposition au risque, infrastructures vitales), mais **aucun moyen d'en produire une synthèse de niveau stratégique** destinée à l'autorité politique (Président de la République, Premier Ministre, Conseil de sécurité). Aujourd'hui une telle synthèse se fabrique à la main, hors plateforme, sans garantie de cohérence avec les données ni de traçabilité.

Le moteur de rapport ([[RFC 0021]]) existe mais ne produit que des documents **au niveau d'une mission** (rapport d'audit, note de cadrage, CR). Il manque un **document au niveau national / portefeuille**.

## 2. Objectif

1. Générer un **rapport stratégique de supervision nationale** à partir des données réelles, au registre d'un document destiné au plus haut niveau de l'État.
2. Trois variantes à la demande : **rapport global** (Regul + Risk + lecture croisée), **volet Regul seul**, **volet Risk seul**.
3. Cadence **à la demande et annuelle**, format **stratégique court** (synthèse, volets, décisions, annexes).
4. Rester **confidentiel** (classification, diffusion restreinte, rendu côté client) et **tracé** (génération consignée en piste d'audit).

## 3. Principe directeur

Ne pas réinventer le rendu : ajouter un **nouveau type de document « national »** au moteur [[RFC 0021]] (react-pdf, rendu côté navigateur, texte vectoriel, confidentialité préservée). La nouveauté est **l'agrégation au niveau du portefeuille supervisé** (et non d'une mission), via des RPC dédiées scopées au périmètre du régulateur. La maquette fixe la structure ; cette RFC fixe les sources de données et les agrégats.

## 4. Portée et variantes

- **Édition** : régulateur (`supervision`). Génération réservée à un rôle habilité (permission dédiée, §8).
- **Variantes** : `global` | `regul` | `risk` (sélection à la génération ; la lecture croisée n'existe qu'en `global`).
- **Cadence** : à la demande + exercice annuel. Le type porte une **période** (année ou intervalle).
- **Format** : stratégique court (la maquette : ~12 pages, couverture, lettre, sommaire, synthèse, contexte, 2 pages Regul, 2 pages Risk, lecture croisée, décisions, perspectives, annexes).

## 5. Structure du document

Reprend la maquette : couverture classifiée + liste de diffusion ; lettre de transmission signée ; sommaire ; **synthèse exécutive** (verdict + indicateurs avec tendances) ; contexte/mandat/méthode ; **Regul** (conformité par secteur et référentiel, écarts récurrents ; mesures graduées, aging des actions, vitales sous mesure) ; **Risk** (zones d'exposition, exposition par secteur, scénarios majeurs, heatmap vitales x dimensions, nœud papillon) ; **lecture croisée conformité x exposition** ; **décisions soumises au Président** ; perspectives ; annexes (échelle, liste des vitales, glossaire, méthode).

Les **décisions** et le **message de l'autorité** sont un **corps éditable** (comme les templates RFC 0021), pré-rempli mais ajustable avant export.

## 6. Données et agrégations (par bloc)

| Bloc du rapport | Source réelle | Agrégat à produire |
|---|---|---|
| Nb assujettis, dont vitales | `get_supervised_org_portfolio`, `entity_regulatory_profile.criticality` | compte, compte IIC |
| Conformité moyenne, par secteur, par référentiel | scoring de `control_assessments` / `assessment_findings`, `organizations.sector`, référentiel de la mission | moyenne pondérée, group by secteur, group by référentiel |
| Constats (majeures/mineures/observations), thèmes récurrents | `assessment_findings.classification`, regroupement par `description` / contrôle | compte par classification, top thèmes |
| Mesures graduées (paliers) | `regulatory_measures` (type/palier) | compte par palier |
| Suivi des actions, aging, taux de clôture | `get_regulator_action_tracking` (+ `due_date`, `status`) | % clôturées, buckets 0-90 / &gt;90 j |
| Exposition nationale, par secteur, zones | `get_supervised_org_portfolio` (avg/max_exposure, is_iic), `get_supervised_risks` | moyenne, group by secteur, bucketing zones (crit/surv/maitr/nonev) |
| Scénarios majeurs | `get_supervised_risks` ordonné par exposition | top N |
| Heatmap vitales x dimensions | `get_supervised_risks` filtré IIC, group by org x dimension | max exposition par cellule |
| Acceptations, revues en retard | `risk_acceptances`, `risk_reviews` / `overdue_reviews` du portefeuille | compte, dérogations |
| Lecture croisée | jointure conformité(secteur) x exposition(secteur) | positionnement 2x2 |
| Piste d'audit (actes tracés) | `activity_log` | compte dans la période |

### 6bis. Nouvelles RPC à créer

Les RPC actuelles renvoient **une ligne par org** ; le rapport a besoin d'**agrégats nationaux**. Proposer deux RPC SECURITY DEFINER, scopées au périmètre supervisé de l'appelant (même logique que `get_supervised_org_portfolio`), AAL2, permission (§8) :

- `get_national_regul_summary(p_from date, p_to date)` : conformité (globale, par secteur, par référentiel), constats par classification + top thèmes, mesures par palier, actions (clôture/aging), actes tracés.
- `get_national_risk_summary(p_from date, p_to date)` : exposition (moyenne/max, par secteur, distribution par zone), top scénarios, heatmap vitales x dimension, acceptations/dérogations, revues en retard.

Chacune renvoie un objet agrégé (JSON) consommé par le template. Le périmètre est **strictement** celui des assujettis supervisés par l'appelant (cf. §8).

## 7. Tendances et historisation

Les indicateurs à tendance (conformité +6 pts, exposition -3 pts) exigent une **comparaison dans le temps**. L'historisation fine n'étant pas complète ([[RFC 0017]] note l'historisation partielle), proposer une table **`national_report_snapshots`** : à chaque génération annuelle, on fige les agrégats clés (date, variante, JSON des métriques). Les deltas se calculent alors d'un exercice à l'autre. Tant qu'aucun historique n'existe, les tendances sont **masquées** (pas de flèche inventée).

## 8. Confidentialité et sécurité

- **Rendu côté client** (react-pdf, [[RFC 0021]] §3) : les données agrégées ne transitent par aucun service de rendu tiers. Critère déterminant pour un document classifié.
- **Classification** : le document porte « Confidentiel · Diffusion restreinte » (en-tête courant + pied de page) et une liste de diffusion. Pas de rendu serveur, pas d'indexation.
- **Permission** : nouvelle permission **`can_generate_national_report`** (régulateur habilité). À **backfiller** dans `platform_roles` et le gabarit `admin-create-cabinet`, sous peine de 403 généralisé (cf. règle de seeding des permissions).
- **Scope tenant** : les RPC d'agrégation ne couvrent que les assujettis supervisés par l'appelant ; aucun agrégat cross-tenant.
- **AAL2** sur les RPC et la génération.
- **Traçabilité** : la génération d'un rapport national est consignée dans la piste d'audit (`activity_log`) : qui, quand, quelle variante, quelle période.

## 9. Intégration au moteur de rapport (RFC 0021)

- Nouveau **type de document « Rapport de supervision nationale »** dans le catalogue de templates, distinct des documents de mission.
- Sélecteur de **variante** (global/regul/risk) et de **période** au lancement.
- En-têtes/pieds classifiés, numérotation, couverture institutionnelle, corps éditable (message de l'autorité, décisions).
- Export **PDF** (et éventuellement une version de travail avant signature).

## 10. Décisions actées

- **D1 - RPC d'agrégation** : **deux RPC** (`get_national_regul_summary`, `get_national_risk_summary`), pour générer les volets séparément.
- **D2 - Historisation / tendances** : **créer `national_report_snapshots` dès le socle** ; les agrégats sont figés à chaque exercice, les tendances apparaissent dès le 2e rapport annuel ; aucune flèche affichée tant qu'il n'y a pas d'historique.
- **D3 - Permission** : **permission dédiée `can_generate_national_report`** (backfillée dans `platform_roles` + gabarit `admin-create-cabinet`).
- **D4 - Corps éditable** : **message de transmission + décisions + perspectives** éditables ; tous les chiffres, tableaux et agrégats restent calculés depuis les données.
- **D5 - Conformité** : le « taux de conformité » **réutilise le scoring de clôture de mission existant** (un seul chiffre de conformité cohérent sur toute la plateforme). Le calcul exact est à relire dans `close-mission` au Lot 1.

## 11. Découpage de livraison

- **Lot 1 - Agrégats** : RPC `get_national_regul_summary` + `get_national_risk_summary` (scopées, AAL2) + permission `can_generate_national_report` (backfill + gabarit).
- **Lot 2 - Template global** : nouveau type de document dans le moteur, variante `global`, rendu react-pdf (couverture, synthèse, Regul, Risk, lecture croisée, décisions, annexes).
- **Lot 3 - Variantes** : génération `regul` seul et `risk` seul (filtrage des sections).
- **Lot 4 - Corps éditable** : message de l'autorité, décisions et perspectives éditables avant export.
- **Lot 5 - Historisation** : `national_report_snapshots` + calcul et affichage des tendances annuelles.
- **Lot 6 - Traçabilité** : consignation de la génération en piste d'audit.

## 12. Non-régression / hors scope

- **Additif** : n'affecte pas les documents de mission existants ni le pipeline d'évaluation.
- **Hors scope v1** : signature électronique du rapport, diffusion automatisée aux destinataires, multilingue, génération planifiée automatique (au-delà de l'annuel à la demande), comparaisons infra-annuelles tant que l'historisation n'est pas consolidée.
