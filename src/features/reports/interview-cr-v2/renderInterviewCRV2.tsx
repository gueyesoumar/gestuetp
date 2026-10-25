import { pdf } from '@react-pdf/renderer'
import { InterviewCRDocument } from './InterviewCRDocument'
import type { CRData } from '../interview-cr'

type CRInput = CRData & {
  templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null
  templateTexts?: Record<string, string> | null
}

// Rendu v2 du compte-rendu d'entretien (react-pdf), 100% cote client. Atteint via la
// modale d'apercu (React.lazy), donc react-pdf reste hors du bundle initial. E2.2.
export async function renderInterviewCRV2(data: CRInput): Promise<void> {
  const blob = await pdf(<InterviewCRDocument data={data} />).toBlob()
  const safeName = data.interview.title.replace(/[^a-zA-Z0-9à-ü]/g, '_').slice(0, 40)
  triggerDownload(blob, `CR_${safeName}_${data.interview.scheduled_date}.pdf`)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
