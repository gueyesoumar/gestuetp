import { ROLE_LABELS } from '../../missions/mission-constants'
import { computeDurationWeeks, type ScopingNoteData } from '../scoping-note/context'
import type { ReportTheme } from '../report-kit/theme'

// Modele de donnees de la note de cadrage v2 (react-pdf). Reutilise le type et les
// calculs du moteur v1 ; ne depend PAS de jsPDF. RFC 0021 E2.1.

export interface ScopingDecoratedData extends ScopingNoteData {
  includedControls: number
  totalControls: number
  excludedIds: Set<string>
  durationWeeks: number
  roleLabel: (role: string) => string
  /** Sections resolues du template (ordre + visibilite + options). */
  templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null
  /** Surcharges de libelles du template. */
  templateTexts?: Record<string, string> | null
}

/** Props communes des sections de la note de cadrage (num/titre/chapeau/options resolus). */
export interface ScopingSectionProps {
  data: ScopingDecoratedData
  theme: ReportTheme
  num: string
  title: string
  lead: string
  options: Record<string, unknown>
}

export function decorateScoping(
  data: ScopingNoteData,
  templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null,
  templateTexts?: Record<string, string> | null,
): ScopingDecoratedData {
  const excludedIds = new Set(data.exclusions.map((e) => e.control_id))
  const totalControls = data.domains.reduce((s, d) => s + d.controls.length, 0)
  const roleLabel = (role: string): string => {
    if (data.reviewLabels) {
      if (role === 'lead_auditor') return data.reviewLabels.lead
      if (role === 'associate') return data.reviewLabels.associate
    }
    return ROLE_LABELS[role] ?? role
  }
  return {
    ...data,
    includedControls: totalControls - excludedIds.size,
    totalControls,
    excludedIds,
    durationWeeks: computeDurationWeeks(data.mission.start_date, data.mission.end_date),
    roleLabel,
    templateSections,
    templateTexts,
  }
}
