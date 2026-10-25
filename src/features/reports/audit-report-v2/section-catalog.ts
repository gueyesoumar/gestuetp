// Catalogue des sections de contenu du RAPPORT D'AUDIT (key + titre + chapeau +
// options declarees). Les types et le resolveur sont dans le socle partage
// (report-kit/catalog), reutilises par les autres documents (RFC 0021 E2).
import { resolveOptions as resolveOptionsKit, type OptionDef, type SectionCatalogEntry } from '../report-kit/catalog'

export type { OptionDef, SectionCatalogEntry }

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

/** Options resolues d'une section du rapport d'audit (defaut catalogue + surcharge). */
export function resolveOptions(sectionKey: string, templateOptions: Record<string, unknown> | undefined): Record<string, unknown> {
  return resolveOptionsKit(SECTION_CATALOG, sectionKey, templateOptions)
}
