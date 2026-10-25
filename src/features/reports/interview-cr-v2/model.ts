import { parseNotes, type Sections } from '../interview-cr/parse-notes'
import { timeToMin } from '../interview-cr/static-helpers'
import type { CRData } from '../interview-cr'
import type { ReportTheme } from '../report-kit/theme'
import type { ReportTemplateSection } from '../../../types/database.types'

// Modele de donnees du compte-rendu d'entretien v2 (react-pdf). Reutilise le type et
// le parseur de notes du moteur v1 ; ne depend PAS de jsPDF. RFC 0021 E2.2.

export interface CRDecoratedData extends CRData {
  parsed: Sections
  dateStr: string
  timeRange: string
  templateSections?: ReportTemplateSection[] | null
  templateTexts?: Record<string, string> | null
}

export interface CRSectionProps {
  data: CRDecoratedData
  theme: ReportTheme
  title: string
  lead: string
  options: Record<string, unknown>
}

export function decorateCR(
  data: CRData,
  templateSections?: ReportTemplateSection[] | null,
  templateTexts?: Record<string, string> | null,
): CRDecoratedData {
  const parsed = parseNotes(data.rawNotes)
  const dateStr = new Date(data.interview.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = data.interview.scheduled_time.slice(0, 5)
  const endMin = timeToMin(data.interview.scheduled_time) + data.interview.duration_minutes
  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
  return { ...data, parsed, dateStr, timeRange: `${time} - ${endTime} (${data.interview.duration_minutes} min)`, templateSections, templateTexts }
}
