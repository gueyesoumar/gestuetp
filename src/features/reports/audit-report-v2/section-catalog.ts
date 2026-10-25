// Catalogue des sections de contenu du rapport (key + titre + chapeau par defaut),
// SANS dependance react-pdf : l'editeur de templates l'importe sans tirer le moteur
// PDF dans le bundle. Source de verite des libelles/chapeaux/ordre par defaut.
export interface SectionCatalogEntry { key: string; title: string; lead: string }

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  { key: 'context', title: 'Contexte de la mission', lead: 'Périmètre, objectifs et cadre de l’audit' },
  { key: 'methodology', title: 'Méthodologie', lead: 'Démarche, référentiel et barème d’évaluation' },
  { key: 'synthesis', title: 'Synthèse exécutive', lead: 'Score de conformité, opinion et chiffres clés' },
  { key: 'domains', title: 'Résultats par domaine', lead: 'Score et analyse de chaque domaine du référentiel' },
  { key: 'nc_fiches', title: 'Fiches de non-conformités majeures', lead: 'Détail des écarts majeurs : exigence, constat, risque et recommandation' },
  { key: 'recommendations', title: 'Recommandations', lead: 'Hiérarchisation des recommandations selon l’axe impact x effort' },
  { key: 'action_plan', title: 'Plan d’action', lead: 'Récapitulatif des actions correctives, suivies sur la plateforme' },
  { key: 'conclusion', title: 'Conclusion', lead: 'Synthèse du jugement d’audit et suites attendues' },
  { key: 'annex_glossary', title: 'Annexe A - Glossaire', lead: 'Définitions des termes techniques utilisés dans le rapport' },
  { key: 'annex_evidence', title: 'Annexe B - Preuves examinées', lead: 'Éléments documentaires versés au dossier de mission' },
  { key: 'annex_references', title: 'Annexe C - Références normatives', lead: 'Standards et bonnes pratiques mobilisés au cours de l’audit' },
  { key: 'annex_distribution', title: 'Annexe D - Liste de diffusion', lead: 'Destinataires autorisés du présent rapport (confidentialité)' },
]
