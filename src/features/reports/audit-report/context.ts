import type { MissionDetail, MissionMemberRow } from '../../missions/useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { AssessmentFinding, CabinetClient, ControlAssessment } from '../../../types/database.types'
import { conformityWeight } from './utils'

// Types + calculs du rapport d'audit, PARTAGES par le moteur react-pdf v2. Le moteur
// jsPDF v1 a ete retire (RFC 0021 Lot 4) : ce fichier ne contient plus de dependance PDF.

// -- Types -----------------------------------------------------------------

export interface AssessmentWithControl extends ControlAssessment {
  control: { id: string; code: string; name: string; description: string | null; domain_id: string }
  /**
   * Champs synthetises a partir de assessment_findings par loadAuditReportData
   * pour le rendu (findings concatenes, classification top-severite).
   * Ne PAS utiliser ces champs hors du generateur - preferer findings_list.
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
  /** Couleurs de marque pour le rapport. Hex (#RRGGBB) ou null -> fallback Forest/Gold. */
  cabinetPrimaryColor: string | null
  cabinetAccentColor: string | null
  evidenceDocs: EvidenceDoc[]
  /** Sections resolues du template de rapport (ordre + visibilite + options). null/absent =
   *  ordre integre par defaut. RFC 0021 Lot 3. */
  templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null
  /** Surcharges de libelles du template (RFC 0021 B1). null/absent = defauts. */
  templateTexts?: Record<string, string> | null
  /** Décoré par report-model.decorateData, pas requis côté loader. */
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

// -- Calculs ---------------------------------------------------------------

export function computeTotals(assessments: AssessmentWithControl[]): AuditTotals {
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

export function computeDomainStats(domains: DomainWithControls[], assessments: AssessmentWithControl[]): DomainStat[] {
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
