import type { AuditReportData } from '../generateAuditReportPDF'
import { computeTotals, computeDomainStats, type AuditTotals, type DomainStat } from '../audit-report/context'

// Modele de donnees du rapport v2 (react-pdf). Reutilise le loader et les calculs
// existants (computeTotals/computeDomainStats) ; ne depend PAS de jsPDF.

export interface ReportTheme {
  primary: string
  accent: string
  ink: string
  muted: string
  surface: string
  border: string
  onPrimary: string
}

/** Charte derivee d'organization_branding (hex), repli sur la charte Gestu. */
export function buildTheme(data: AuditReportData): ReportTheme {
  const hex = (v: string | null, fb: string): string => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb)
  return {
    primary: hex(data.cabinetPrimaryColor, '#1B4332'),
    accent: hex(data.cabinetAccentColor, '#D4A843'),
    ink: '#1a2e23',
    muted: '#6b7280',
    surface: '#ffffff',
    border: '#e5e7eb',
    onPrimary: '#ffffff',
  }
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

/** Libelle surcharge par le template (B1) sinon le defaut integre. */
export function resolveText(texts: Record<string, string> | null | undefined, key: string, fallback: string): string {
  const v = texts?.[key]
  return v && v.trim().length > 0 ? v : fallback
}

/** Reference du rapport, identique au moteur v1 (AUD-AAAA-NNN, deterministe). */
export function computeReportRef(missionId: string, endDate: string | null | undefined): string {
  const year = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear()
  let h = 0
  for (let i = 0; i < missionId.length; i++) h = ((h << 5) - h + missionId.charCodeAt(i)) | 0
  const seq = Math.abs(h) % 1000
  return `AUD-${year}-${String(seq).padStart(3, '0')}`
}
