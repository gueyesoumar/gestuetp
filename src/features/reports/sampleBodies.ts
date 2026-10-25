import { buildSampleReportData } from './audit-report-v2/sampleReportData'
import { decorateData, type DecoratedData } from './audit-report-v2/report-model'
import { generateContextNarrative, generateMethodologyNarrative, generateConclusionNarrative } from './auditReportNarratives'

// Texte GÉNÉRÉ (sur données d'illustration) proposé comme point de départ éditable
// pour la surcharge de corps d'une section (B1.2). Fonctions pures (pas de react-pdf),
// donc utilisables dans l'éditeur. Le cabinet adapte ensuite le texte à sa convenance.

let auditData: DecoratedData | null = null
function audit(): DecoratedData {
  if (!auditData) auditData = decorateData(buildSampleReportData())
  return auditData
}

const AUDIT_BODIES: Record<string, () => string[]> = {
  context: () => generateContextNarrative(audit()),
  methodology: () => generateMethodologyNarrative(audit()),
  conclusion: () => generateConclusionNarrative(audit()),
}

/** Texte proposé (paragraphes joints) pour une section surchargeable, ou '' si aucun. */
export function getSampleBody(documentType: string, sectionKey: string): string {
  if (documentType === 'audit_report') {
    const fn = AUDIT_BODIES[sectionKey]
    return fn ? fn().join('\n\n') : ''
  }
  return ''
}
