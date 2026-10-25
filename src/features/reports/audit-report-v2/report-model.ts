import type { AuditReportData } from '../generateAuditReportPDF'
import { computeTotals, computeDomainStats, type AuditTotals, type DomainStat } from '../audit-report/context'
import { buildTheme as buildThemeKit, computeDocRef, type ReportTheme } from '../report-kit/theme'

// Modele de donnees du rapport v2 (react-pdf). Reutilise le loader et les calculs
// existants (computeTotals/computeDomainStats) ; ne depend PAS de jsPDF. La charte,
// la resolution de libelles et la reference sont desormais dans report-kit (partage
// avec les autres documents, RFC 0021 E2).

export type { ReportTheme }
export { resolveText } from '../report-kit/theme'

/** Charte derivee d'organization_branding (hex), repli sur la charte Gestu. */
export function buildTheme(data: AuditReportData): ReportTheme {
  return buildThemeKit(data.cabinetPrimaryColor, data.cabinetAccentColor)
}

/** Donnees decorees des totaux : les fonctions de prose (auditReportNarratives)
 *  lisent data.totals/data.domainStats, que le loader ne renseigne pas. */
export type DecoratedData = AuditReportData & { totals: AuditTotals; domainStats: DomainStat[] }

export function decorateData(data: AuditReportData): DecoratedData {
  return {
    ...data,
    totals: computeTotals(data.assessments),
    domainStats: computeDomainStats(data.domains, data.assessments),
  }
}

/** Reference du rapport, identique au moteur v1 (AUD-AAAA-NNN, deterministe). */
export function computeReportRef(missionId: string, endDate: string | null | undefined): string {
  return computeDocRef('AUD', missionId, endDate)
}
