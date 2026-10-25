// Catalogue des sections de la NOTE DE CADRAGE (key + titre + chapeau + options),
// SANS dependance react-pdf (editeur de templates). Repris du moteur jsPDF v1
// (scoping-note/sections.ts) a l'identique. RFC 0021 E2.1.
import { resolveOptions as resolveOptionsKit, type SectionCatalogEntry } from '../report-kit/catalog'

export const SCOPING_SECTION_CATALOG: SectionCatalogEntry[] = [
  { key: 'preambule', title: 'Préambule', lead: 'Présentation du client, déclencheur de l’audit et cadre normatif applicable' },
  { key: 'objectifs', title: 'Objectifs', lead: 'Ce que la mission cherche à mesurer, objectifs structurels et critères' },
  { key: 'perimetre', title: 'Périmètre', lead: 'Les quatre dimensions du périmètre, inclusions et exclusions' },
  { key: 'methodologie', title: 'Méthodologie', lead: 'Démarche d’audit fondée sur les risques, phases et échelle de maturité' },
  { key: 'risques', title: 'Risques initiaux', lead: 'Risques identifiés au cadrage et recommandations associées' },
  {
    key: 'equipe', title: 'Organisation', lead: 'Équipe d’audit affectée et matrice RACI',
    options: [{ key: 'raci', label: 'Afficher la matrice RACI', type: 'toggle', default: true }],
  },
  {
    key: 'planning', title: 'Planning', lead: 'Découpage en phases proportionnelles et jalons clés',
    options: [{ key: 'gantt', label: 'Afficher le diagramme de Gantt', type: 'toggle', default: true }],
  },
  { key: 'livrables', title: 'Livrables & gouvernance', lead: 'Livrables attendus et instances de pilotage de la mission' },
  { key: 'hypotheses', title: 'Hypothèses & limitations', lead: 'Hypothèses retenues, conditions de réussite et cadre de validité' },
  { key: 'signatures', title: 'Validation', lead: 'Signatures pour bon accord sur le cadrage et ses conditions' },
]

/** Options resolues d'une section de la note de cadrage (defaut catalogue + surcharge). */
export function resolveScopingOptions(sectionKey: string, templateOptions: Record<string, unknown> | undefined): Record<string, unknown> {
  return resolveOptionsKit(SCOPING_SECTION_CATALOG, sectionKey, templateOptions)
}
