import type jsPDF from 'jspdf'
import type { MissionDetail, MissionMemberRow } from '../../missions/useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { CabinetClient, MissionExclusion, MissionRisk } from '../../../types/database.types'
import { ROLE_LABELS } from '../../missions/mission-constants'

export interface ScopingNoteData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  exclusions: MissionExclusion[]
  risks: MissionRisk[]
  client: CabinetClient | null
  questionnaireProgress: number
  documentsReceived: number
  documentsExpected: number
  reviewLabels?: { lead: string; associate: string }
}

export interface DocContext {
  doc: jsPDF
  data: ScopingNoteData
  pageW: number
  pageH: number
  marginL: number
  marginR: number
  contentW: number
  y: number
  // computed once
  includedControls: number
  totalControls: number
  excludedIds: Set<string>
  durationWeeks: number
  roleLabel: (role: string) => string
}

export function createContext(doc: jsPDF, data: ScopingNoteData): DocContext {
  const pageW = 210
  const pageH = 297
  const marginL = 18
  const marginR = 18
  const excludedIds = new Set(data.exclusions.map((e) => e.control_id))
  const totalControls = data.domains.reduce((s, d) => s + d.controls.length, 0)
  const includedControls = totalControls - excludedIds.size
  const durationWeeks = computeDurationWeeks(data.mission.start_date, data.mission.end_date)
  const roleLabel = (role: string): string => {
    if (data.reviewLabels) {
      if (role === 'lead_auditor') return data.reviewLabels.lead
      if (role === 'associate') return data.reviewLabels.associate
    }
    return ROLE_LABELS[role] ?? role
  }
  return {
    doc, data, pageW, pageH, marginL, marginR,
    contentW: pageW - marginL - marginR,
    y: 0,
    includedControls, totalControls, excludedIds, durationWeeks, roleLabel,
  }
}

export function computeDurationWeeks(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)))
}
