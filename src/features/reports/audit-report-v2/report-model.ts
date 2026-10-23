import { conformityWeight } from '../audit-report/utils'
import type { AuditReportData, AssessmentWithControl } from '../generateAuditReportPDF'

// Modele de donnees du rapport v2 (react-pdf). Reutilise le loader et les helpers
// existants ; ne depend PAS de jsPDF ni du DocContext (decouple du moteur v1).

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

export interface ReportTotals {
  total: number
  assessed: number
  conformes: number
  ncMajor: number
  ncMinor: number
  observations: number
  score: number
}

/** Memes ponderations que le moteur v1 (c=100, lc=75, pc=50, nc=0, na exclu). */
export function computeTotals(assessments: AssessmentWithControl[]): ReportTotals {
  let sum = 0
  let n = 0
  for (const a of assessments) {
    const w = conformityWeight(a.conformity_level)
    if (w !== null) { sum += w; n += 1 }
  }
  const by = (c: string): number => assessments.filter((a) => a.finding_classification === c).length
  return {
    total: assessments.length,
    assessed: n,
    conformes: assessments.filter((a) => a.conformity_level === 'c').length,
    ncMajor: by('major_nc'),
    ncMinor: by('minor_nc'),
    observations: by('observation'),
    score: n ? Math.round(sum / n) : 0,
  }
}

/** Reference du rapport, identique au moteur v1 (AUD-AAAA-NNN, deterministe). */
export function computeReportRef(missionId: string, endDate: string | null | undefined): string {
  const year = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear()
  let h = 0
  for (let i = 0; i < missionId.length; i++) h = ((h << 5) - h + missionId.charCodeAt(i)) | 0
  const seq = Math.abs(h) % 1000
  return `AUD-${year}-${String(seq).padStart(3, '0')}`
}
