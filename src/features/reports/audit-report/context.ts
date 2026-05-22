import type jsPDF from 'jspdf'
import type { MissionDetail, MissionMemberRow } from '../../missions/useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { AssessmentFinding, CabinetClient, ControlAssessment } from '../../../types/database.types'
import { type RGB, FOREST_900, GOLD_500 } from './colors'
import { conformityWeight } from './utils'

// ── Types externes ─────────────────────────────────────────────────────────

export interface AssessmentWithControl extends ControlAssessment {
  control: { id: string; code: string; name: string; description: string | null; domain_id: string }
  /**
   * Champs synthetises a partir de assessment_findings par loadAuditReportData
   * pour le rendu du PDF (findings concatenes, classification top-severite).
   * Ne PAS utiliser ces champs hors du generateur PDF — preferer findings_list.
   */
  findings: string | null
  recommendations: string | null
  risk_notes: string | null
  finding_classification: string | null
  findings_list: AssessmentFinding[]
}

export interface ClientContact {
  id: string
  contact_name: string
  email: string
  job_title: string | null
  portal_status: string
}

export interface EvidenceDoc {
  id: string
  file_name: string
  document_type: string | null
  created_at: string
}

export interface AuditReportData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  assessments: AssessmentWithControl[]
  client: CabinetClient | null
  clientContacts: ClientContact[]
  cabinetName: string
  cabinetLogoUrl?: string | null
  cabinetLogoDarkUrl?: string | null
  cabinetAddress: string | null
  cabinetPhone: string | null
  cabinetWebsite: string | null
  cabinetSupportEmail: string | null
  cabinetFooterText: string | null
  /** Couleurs de marque pour le rapport. Hex (#RRGGBB) ou null → fallback Forest/Gold. */
  cabinetPrimaryColor: string | null
  cabinetAccentColor: string | null
  evidenceDocs: EvidenceDoc[]
  /** Décoré par createContext, pas requis côté loader. */
  totals?: AuditTotals
  domainStats?: DomainStat[]
}

export interface AuditTotals {
  totalControls: number
  assessed: number
  conformes: number; largement: number; partiels: number; nonConformes: number; na: number
  ncMajor: number; ncMinor: number; observations: number
  conformityScore: number
}

export interface DomainStat {
  code: string; name: string; description: string | null
  total: number; scored: number; score: number
  conformes: number; ncMajor: number; ncMinor: number; observations: number
}

export interface Palette {
  /** Couleur de marque dominante (sections, hero, scores). Fallback FOREST_900. */
  primary: RGB
  /** Variante claire (5-8 %) du primary pour blocs/encarts. */
  primaryLight: RGB
  /** Couleur d'accent (filets, badges, chiffres). Fallback GOLD_500. */
  accent: RGB
  /** Variante claire de l'accent pour bandeaux d'info. */
  accentLight: RGB
}

export interface DocContext {
  doc: jsPDF
  data: AuditReportData & { totals: AuditTotals; domainStats: DomainStat[] }
  palette: Palette
  pageW: number; pageH: number
  marginL: number; marginR: number
  contentW: number
  y: number
  reportRef: string
  /** map page number → label de section pour le footer dynamique */
  sectionByPage: Map<number, string>
  currentSection: string
  /** Pages où NE PAS afficher header/footer/watermark (couverture). */
  bareCoverPages: Set<number>
  /** Repère les pages de début de section pour le sommaire. */
  tocAnchors: { num: string; title: string; page: number }[]
  /** Numéro de la page TOC, pour overwrite des numéros de page à la fin. */
  tocPageNumber: number | null
  /** Lignes TOC à compléter à la fin : (anchorKey, y) */
  tocLines: { anchorKey: string; y: number }[]
}

export function createContext(doc: jsPDF, data: AuditReportData): DocContext {
  const totals = computeTotals(data.assessments)
  const domainStats = computeDomainStats(data.domains, data.assessments)
  const palette = buildPalette(data.cabinetPrimaryColor ?? null, data.cabinetAccentColor ?? null)
  return {
    doc,
    data: { ...data, totals, domainStats },
    palette,
    pageW: 210, pageH: 297, marginL: 18, marginR: 18,
    contentW: 174, y: 0,
    reportRef: computeReportRef(data.mission.id, data.mission.end_date),
    sectionByPage: new Map(),
    currentSection: 'Couverture',
    bareCoverPages: new Set([1]),
    tocAnchors: [],
    tocPageNumber: null,
    tocLines: [],
  }
}

function buildPalette(primaryHex: string | null, accentHex: string | null): Palette {
  const primary = hexToRgb(primaryHex) ?? FOREST_900
  const accent = hexToRgb(accentHex) ?? GOLD_500
  return {
    primary,
    primaryLight: lightenRgb(primary, 0.92),
    accent,
    accentLight: lightenRgb(accent, 0.85),
  }
}

function hexToRgb(hex: string | null | undefined): RGB | null {
  if (!hex) return null
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function lightenRgb(rgb: RGB, ratio: number): RGB {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * ratio),
    Math.round(rgb[1] + (255 - rgb[1]) * ratio),
    Math.round(rgb[2] + (255 - rgb[2]) * ratio),
  ]
}

function computeTotals(assessments: AssessmentWithControl[]): AuditTotals {
  let assessed = 0, c = 0, lc = 0, pc = 0, nc = 0, na = 0, ncMajor = 0, ncMinor = 0, observations = 0
  let scoreSum = 0, scoreCount = 0
  for (const a of assessments) {
    assessed++
    switch (a.conformity_level) {
      case 'c': c++; break; case 'lc': lc++; break; case 'pc': pc++; break
      case 'nc': nc++; break; case 'na': na++; break
    }
    const w = conformityWeight(a.conformity_level)
    if (w !== null) { scoreSum += w; scoreCount++ }
    switch (a.finding_classification) {
      case 'major_nc': ncMajor++; break
      case 'minor_nc': ncMinor++; break
      case 'observation': observations++; break
    }
  }
  return {
    totalControls: assessments.length, assessed,
    conformes: c, largement: lc, partiels: pc, nonConformes: nc, na,
    ncMajor, ncMinor, observations,
    conformityScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
  }
}

function computeDomainStats(domains: DomainWithControls[], assessments: AssessmentWithControl[]): DomainStat[] {
  const byControl = new Map(assessments.map((a) => [a.control_id, a]))
  return domains.map((d) => {
    let scored = 0, sum = 0, conformes = 0, ncMajor = 0, ncMinor = 0, observations = 0
    for (const c of d.controls) {
      const a = byControl.get(c.id)
      if (!a) continue
      const w = conformityWeight(a.conformity_level)
      if (w !== null) { sum += w; scored++ }
      if (a.conformity_level === 'c') conformes++
      if (a.finding_classification === 'major_nc') ncMajor++
      if (a.finding_classification === 'minor_nc') ncMinor++
      if (a.finding_classification === 'observation') observations++
    }
    return {
      code: d.code, name: d.name,
      description: (d as unknown as { description: string | null }).description ?? null,
      total: d.controls.length,
      scored, score: scored > 0 ? Math.round(sum / scored) : 0,
      conformes, ncMajor, ncMinor, observations,
    }
  })
}

function computeReportRef(missionId: string, endDate: string | null | undefined): string {
  const year = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear()
  let h = 0
  for (let i = 0; i < missionId.length; i++) h = ((h << 5) - h + missionId.charCodeAt(i)) | 0
  const seq = Math.abs(h) % 1000
  return `AUD-${year}-${String(seq).padStart(3, '0')}`
}
