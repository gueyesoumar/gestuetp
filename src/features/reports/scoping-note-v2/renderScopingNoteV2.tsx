import { pdf } from '@react-pdf/renderer'
import { ScopingNoteDocument } from './ScopingNoteDocument'
import type { ScopingNoteData } from '../scoping-note/context'

type ScopingInput = ScopingNoteData & {
  templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null
  templateTexts?: Record<string, string> | null
}

// Rendu v2 de la note de cadrage (react-pdf), 100% cote client. Atteint via la modale
// d'apercu (React.lazy), donc react-pdf reste hors du bundle initial. RFC 0021 E2.1.
export async function renderScopingNoteV2(data: ScopingInput): Promise<void> {
  const blob = await pdf(<ScopingNoteDocument data={data} />).toBlob()
  const safeName = (data.client?.client_name ?? data.mission.name).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  triggerDownload(blob, `Note_cadrage_${safeName}.pdf`)
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
