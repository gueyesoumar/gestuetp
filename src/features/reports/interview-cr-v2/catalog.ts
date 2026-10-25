// Catalogue des sections du COMPTE-RENDU D'ENTRETIEN (key + titre + chapeau),
// SANS dependance react-pdf (editeur de templates). Repris du moteur jsPDF v1
// (interview-cr/index.ts). RFC 0021 E2.2.
import { resolveOptions as resolveOptionsKit, type SectionCatalogEntry } from '../report-kit/catalog'

export const CR_SECTION_CATALOG: SectionCatalogEntry[] = [
  { key: 'objet', title: 'Objet de l’entretien', lead: 'Rappel du sujet et du cadre de l’entretien' },
  { key: 'constats', title: 'Constats principaux', lead: 'Éléments relevés au cours de l’entretien' },
  { key: 'positifs', title: 'Points positifs', lead: 'Dispositifs en place et pratiques satisfaisantes' },
  { key: 'attention', title: 'Points d’attention', lead: 'Écarts, manques et sujets à approfondir' },
  { key: 'actions', title: 'Actions à suivre', lead: 'Actions identifiées et suites à donner' },
  { key: 'documents', title: 'Documents mentionnés / à collecter', lead: 'Pièces évoquées et éléments de preuve à obtenir' },
  { key: 'signatures', title: 'Signatures', lead: 'Validation du compte-rendu par les parties' },
]

/** Options resolues d'une section du CR (defaut catalogue + surcharge template). */
export function resolveCROptions(sectionKey: string, templateOptions: Record<string, unknown> | undefined): Record<string, unknown> {
  return resolveOptionsKit(CR_SECTION_CATALOG, sectionKey, templateOptions)
}
