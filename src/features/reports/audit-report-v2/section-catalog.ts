// Catalogue des sections de contenu du rapport (key + titre + chapeau + options
// declarees), SANS dependance react-pdf : l'editeur de templates l'importe sans
// tirer le moteur PDF. Source de verite des libelles/chapeaux/ordre/options.

export type OptionDef =
  | { key: string; label: string; type: 'toggle'; default: boolean }
  | { key: string; label: string; type: 'number'; default: number; min: number; max: number }

export interface SectionCatalogEntry { key: string; title: string; lead: string; options?: OptionDef[] }

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  { key: 'context', title: 'Contexte de la mission', lead: 'Périmètre, objectifs et cadre de l’audit' },
  { key: 'methodology', title: 'Méthodologie', lead: 'Démarche, référentiel et barème d’évaluation' },
  { key: 'synthesis', title: 'Synthèse exécutive', lead: 'Score de conformité, opinion et chiffres clés' },
  {
    key: 'domains', title: 'Résultats par domaine', lead: 'Score et analyse de chaque domaine du référentiel',
    options: [{ key: 'radar', label: 'Afficher le radar des domaines', type: 'toggle', default: true }],
  },
  {
    key: 'nc_fiches', title: 'Fiches de non-conformités majeures', lead: 'Détail des écarts majeurs : exigence, constat, risque et recommandation',
    options: [{ key: 'showRisk', label: 'Afficher le risque identifié', type: 'toggle', default: true }],
  },
  {
    key: 'recommendations', title: 'Recommandations', lead: 'Hiérarchisation des recommandations selon l’axe impact x effort',
    options: [
      { key: 'matrix', label: 'Afficher la matrice de priorisation', type: 'toggle', default: true },
      { key: 'topN', label: 'Nombre de recommandations', type: 'number', default: 10, min: 3, max: 20 },
    ],
  },
  {
    key: 'action_plan', title: 'Plan d’action', lead: 'Récapitulatif des actions correctives, suivies sur la plateforme',
    options: [{ key: 'maxRows', label: 'Lignes max du tableau', type: 'number', default: 40, min: 10, max: 100 }],
  },
  { key: 'conclusion', title: 'Conclusion', lead: 'Synthèse du jugement d’audit et suites attendues' },
  { key: 'annex_glossary', title: 'Annexe A - Glossaire', lead: 'Définitions des termes techniques utilisés dans le rapport' },
  { key: 'annex_evidence', title: 'Annexe B - Preuves examinées', lead: 'Éléments documentaires versés au dossier de mission' },
  { key: 'annex_references', title: 'Annexe C - Références normatives', lead: 'Standards et bonnes pratiques mobilisés au cours de l’audit' },
  { key: 'annex_distribution', title: 'Annexe D - Liste de diffusion', lead: 'Destinataires autorisés du présent rapport (confidentialité)' },
]

/** Options resolues d'une section : defaut du catalogue + surcharge du template. */
export function resolveOptions(sectionKey: string, templateOptions: Record<string, unknown> | undefined): Record<string, unknown> {
  const defs = SECTION_CATALOG.find((c) => c.key === sectionKey)?.options ?? []
  const out: Record<string, unknown> = {}
  for (const d of defs) out[d.key] = templateOptions?.[d.key] ?? d.default
  return out
}
