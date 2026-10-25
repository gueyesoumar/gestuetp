# RFC 0021 - Moteur de rendu des rapports et templates par client

> Statut : **proposition (cadrage, avant tout code)**.
> Fondé sur : [[RFC 0001]] (édition résolue au runtime, vocabulaire), [[RFC 0013]] (framework d'édition data-driven), [[RFC 0002]] (capacités / modules à la carte).
> Réutilise : `organization_branding` (charte cabinet), `useVocab` (vocabulaire par org), le pipeline d'évaluation existant (`control_assessments`, `assessment_findings`), la chaîne d'entitlements (capacité).
> Concerne d'abord le **rapport d'audit** (`src/features/reports/audit-report/`), puis les autres documents générés (plan d'action, note de cadrage, CR d'entretien, rapport de supervision).

---

## 1. Problème

Le rapport d'audit est généré **100 % en vectoriel jsPDF**, par **dessin manuel en millimètres** : chaque titre, chiffre, cellule est positionné à la main avec `doc.text(x, y)`.

Conséquences constatées (backlog n°12, captures à l'appui) :
- **Aucune mise en page automatique** : jsPDF ne gère ni retour à la ligne, ni troncature, ni débordement, ni pagination. Les noms longs (cabinet « Direction Générale du Chiffre... DCSSI », contrôles, clients) débordaient de la page, les titres percutaient la référence, les chiffres KPI à 3 chiffres étaient rognés, les colonnes de tableau débordaient dans la voisine.
- **Maintenance pénible** : corriger la mise en forme = recalculer des coordonnées à la main (cf. le lot de correctifs livré, qui ajoute un helper `fitText` de troncature par largeur mesurée pour éteindre l'incendie, sans supprimer la cause structurelle).
- **Pas d'aperçu** : le document n'existe qu'en PDF final, il n'y a aucune prévisualisation à l'écran.
- **Templates par client impossibles en l'état** (backlog n°12 point 4) : la structure (ordre et liste des sections) est **codée en dur** dans `buildAuditReportPdfBlob` ([index.ts:51-65](../../src/features/reports/audit-report/index.ts)), toujours toutes rendues. Seule la **charte** (couleurs + logos + coordonnées, au niveau cabinet via `organization_branding`) est paramétrable. Pas de table de templates, pas de sélection/ordre/visibilité de sections, vocabulaire non branché, prose en dur.

Le correctif de mise en forme livré **stabilise le rapport maintenant**, mais la question de fond demeure : **le dessin manuel jsPDF n'est pas une base viable** pour un document riche, évolutif et personnalisable par client.

## 2. Objectif

1. **Choisir un moteur de rendu** qui fournit une **mise en page automatique** (wrapping, pagination, débordement gérés par un moteur), un **texte vectoriel sélectionnable**, et un **modèle par composants/sections** adapté à la personnalisation.
2. **Construire un système de templates de rapport par client** (sélection + ordre + visibilité des sections, textes, charte), appuyé sur le moteur choisi.
3. **Préserver la confidentialité** des données d'audit (le rapport porte « Confidentiel - Diffusion restreinte » ; produit régulateur).

## 3. Contrainte structurante : confidentialité (RGPD / secret)

Le rapport agrège des données sensibles (constats, scores, non-conformités d'un assujetti/client). Le **lieu de rendu** détermine qui voit ces données :
- **Rendu côté navigateur** (jsPDF, react-pdf) : les données **ne quittent jamais le poste** de l'auditeur. Aucun tiers, aucun serveur de rendu ne les voit.
- **Rendu côté serveur** (navigateur headless type Puppeteer) : l'intégralité du contenu du rapport **transite par un service de rendu** (à héberger et sécuriser). Pour un produit régulateur à diffusion restreinte, c'est un **point de vigilance fort** (surface d'exposition, DPA, localisation du service).

Cette contrainte pèse lourd dans l'arbitrage ci-dessous.

## 4. Options

| Option | Mise en page | Texte | Lieu de rendu | Templates | Aperçu écran | Infra | Effort migration |
|---|---|---|---|---|---|---|---|
| **A. Statu quo jsPDF** | manuelle (mm) | vectoriel net | navigateur | très coûteux | non | aucune | nul (déjà là) |
| **B. `@react-pdf/renderer`** | **auto (flexbox/Yoga)** | **vectoriel net, sélectionnable** | **navigateur** | **natif (composants)** | possible (même arbre) | **aucune** | **réécriture du rapport** |
| **C. HTML/CSS -> Puppeteer** | **auto (moteur navigateur, CSS complet)** | vectoriel net | **serveur (Chromium)** | facile (HTML/CSS) | **aperçu = PDF** | **service Node+Chromium à monter** | réécriture en HTML + infra |
| **D. HTML + html2canvas -> jsPDF** | CSS mais **rasterisé** | **image (non sélectionnable, flou)** | navigateur | moyen | oui | aucune | réécriture, mais qualité inadaptée |

Notes :
- **A** : ce qu'on a. Robuste, léger, mais chaque évolution de mise en forme reste manuelle et le templating est hors de portée raisonnable.
- **B `@react-pdf/renderer`** : le rapport est décrit en **composants React** avec un moteur de layout type flexbox (wrapping, sauts de page et pagination **automatiques**). Sortie **vectorielle + texte sélectionnable**, **côté client** (confidentialité préservée). Modèle par composants = **fondation naturelle des templates** (composer/masquer des sections). Coût : réécriture du code jsPDF, prise en main d'un sous-ensemble de styles (pas tout le CSS), embarquement des polices (Inter) pour les accents.
- **C Puppeteer** : fidélité **maximale** (vrai CSS, `@page`, `page-break`, grid), et **aperçu écran strictement identique au PDF** (même HTML). Mais exige un **service Node + Chromium** (les Edge Functions Supabase sont en Deno, ne lancent pas Chromium) -> **infra + ops + confidentialité** (les données transitent par le service). Le plus lourd et le plus exposant.
- **D html2canvas** : **écarté**. Sortie en image : texte non sélectionnable, flou au zoom, fichier lourd, pagination bancale - inadapté à un rapport d'audit officiel. (Dépendance déjà présente mais inutilisée par ce rapport.)

## 5. Recommandation

**Option B - `@react-pdf/renderer`.**

Pourquoi :
- **Supprime la classe de bugs** (plus de coordonnées mm à la main : le moteur gère wrapping/pagination/débordement).
- **Reste côté client** : confidentialité des données d'audit **préservée** (critère régulateur fort, cf. §3) - là où Puppeteer exposerait les données à un service de rendu.
- **Pas de nouvelle infra** à exploiter.
- **Modèle par composants = fondation directe des templates** par client (§6).
- Texte **vectoriel sélectionnable** conservé.

**Option C (Puppeteer)** ne devient préférable **que si** la fidélité CSS maximale et l'aperçu écran = PDF sont jugés indispensables **et** qu'on accepte de monter/sécuriser un service de rendu **et** d'assumer le transit des données sensibles. Pour un produit à diffusion restreinte, la recommandation penche nettement vers B.

## 6. Système de templates par client (couplé au moteur)

Le templating ne se décide **pas séparément** du moteur : avec B, une « section » est un composant React ; un template devient une **composition de sections paramétrée**.

Modèle proposé (data-driven, cohérent avec [[RFC 0013]]) :
- Table `report_templates` : `id`, `organization_id` (cabinet/éditeur), `scope` (défaut cabinet, ou spécifique `client_id`), `name`, `sections` (jsonb : liste ordonnée `{ key, visible, options }`), `texts` (jsonb : surcharges de libellés/prose), `branding_override` (jsonb optionnel), `created_at/updated_at`.
- **Registre de sections** : chaque section (couverture, lettre, synthèse, score, fiches NC, plan d'action, annexes...) exposée par une `key` stable + un composant. Le template choisit **lesquelles**, dans **quel ordre**, avec **quelles options**.
- **Textes / vocabulaire** : brancher `useVocab` (déjà existant) + externaliser la prose aujourd'hui en dur dans `auditReportNarratives.ts`, surchargée par `report_templates.texts`.
- **Charte** : réutilise `organization_branding` (déjà en place : palette + logos + coordonnées), avec surcharge optionnelle par template.
- **Sélection** : à la génération, résoudre le template applicable (client spécifique sinon défaut cabinet).

Points déjà à moitié câblés à récupérer : `cabinetFooterText` est **chargé mais jamais rendu** ([context.ts:53](../../src/features/reports/audit-report/context.ts)) - exemple typique d'extension dormante.

## 7. Plan de migration (par lots, sans régression)

- **Lot 0 - Acquis** : correctifs de mise en forme jsPDF livrés (stabilisation immédiate). Le rapport actuel reste la référence le temps de la migration.
- **Lot 1 - Socle react-pdf** : installer `@react-pdf/renderer`, embarquer la police Inter, poser le squelette document + le **registre de sections** + un thème dérivé de `organization_branding`. Générer un rapport « coquille » (couverture + 1 section) derrière un **feature flag**, sans retirer jsPDF.
- **Lot 2 - Portage des sections** : réécrire les sections une à une en composants (couverture, lettre, synthèse/score, domaines, fiches NC, plan d'action, annexes, charts). Réutiliser `loadAuditReportData` et `auditReportNarratives` tels quels (données + prose inchangées).
- **Lot 3 - Templates** : table `report_templates` + RLS (cloisonnement cabinet, cf. patterns existants), éditeur de template (sections/ordre/visibilité/textes), résolution à la génération. Vocabulaire branché.
- **Lot 4 - Bascule** : activer react-pdf par défaut, retirer le chemin jsPDF du rapport d'audit, puis étendre le socle aux autres documents (plan d'action, note de cadrage, CR, supervision).
- **Transverse** : les points de **contenu** (backlog n°12 points 2 et 3) sont traités dans le portage : afficher le **risque réel** et encadrer/retirer les textes **générés par heuristique** (cause racine, impact, « CAR associée » statique) des fiches NC.

## 8. Décisions à trancher

- **D-REP-1 (moteur)** : B `@react-pdf/renderer` (recommandé, client-side, pas d'infra) **ou** C Puppeteer (fidélité CSS max + aperçu = PDF, mais infra + transit des données sensibles) ?
- **D-REP-2 (portée templates)** : sections (liste/ordre/visibilité) seules d'abord, **ou** inclure d'emblée textes + vocabulaire + surcharge de charte ?
- **D-REP-3 (aperçu)** : un aperçu écran est-il requis (et à quel niveau de fidélité) ? (B permet un aperçu ; C donne un aperçu strictement identique.)
- **D-REP-4 (export Word)** : besoin d'un export `.docx` éditable par le client en plus du PDF ? (change l'arbitrage : docx pousse vers une autre brique.)
- **D-REP-5 (contenus)** : traite-t-on les points n°12.2 / n°12.3 (risque affiché, heuristiques encadrées) **dans** la migration (Lot 2) ou en lot séparé immédiat sur jsPDF ?

## 9. Impacts

- **Sécurité / RGPD** : B conserve le rendu **côté navigateur** (données non exposées) ; C introduit une **surface serveur** à sécuriser (DPA, localisation). `report_templates` suit la RLS cabinet standard (cloisonnement multi-tenant, fonctions SECURITY DEFINER, pas de récursion).
- **Bundle** : `@react-pdf/renderer` ajoute du poids ; chargé en **import dynamique** (comme exceljs/jspdf aujourd'hui), hors bundle initial (cohérent avec le code-splitting du lot perf n°9).
- **Effort** : migration conséquente (Lots 1-4), mais **étalée et sans régression** (feature flag, jsPDF conservé jusqu'à la bascule).
- **Bénéfice** : fin des bugs de mise en page structurels, documents personnalisables par client, socle réutilisable pour tous les rapports.

## 10. Hors périmètre

- Choix d'un moteur de **typographie avancée** (Typst/LaTeX) : surpuissant et lourd en infra, écarté.
- Refonte des **données** du rapport (le pipeline d'agrégation `loadAuditReportData` et la prose `auditReportNarratives` sont réutilisés tels quels ; seuls les points de contenu n°12.2/12.3 sont retouchés).
