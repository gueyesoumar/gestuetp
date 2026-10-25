import { useEffect, useMemo, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { AuditReportDocument } from '../reports/audit-report-v2/AuditReportDocument'
import { buildSampleReportData } from '../reports/audit-report-v2/sampleReportData'
import { ScopingNoteDocument } from '../reports/scoping-note-v2/ScopingNoteDocument'
import { buildSampleScopingData } from '../reports/scoping-note-v2/sampleScopingData'

interface Props {
  documentType: string
  sections: { key: string; visible: boolean; options: Record<string, unknown> }[]
  texts: Record<string, string>
}

// Apercu live de l'editeur (RFC 0021 D1/E2.1). Rendu 100 % client sur donnees
// FACTICES ; charge en React.lazy par le modal (react-pdf hors bundle OrganizationPage).
// Le moteur est choisi par type de document. Debounce interne pour ne recompiler
// qu'a l'arret des modifications.
function buildDocument(documentType: string, sections: Props['sections'], texts: Record<string, string>): JSX.Element {
  const templateTexts = Object.keys(texts).length > 0 ? texts : null
  if (documentType === 'scoping_note') {
    return <ScopingNoteDocument data={{ ...buildSampleScopingData(), templateSections: sections, templateTexts }} />
  }
  return <AuditReportDocument data={{ ...buildSampleReportData(), templateSections: sections, templateTexts }} />
}

export default function TemplatePreviewPane({ documentType, sections, texts }: Props): JSX.Element {
  const [snap, setSnap] = useState<Props>(() => ({ documentType, sections, texts }))
  useEffect(() => {
    const t = setTimeout(() => setSnap({ documentType, sections, texts }), 450)
    return () => clearTimeout(t)
  }, [documentType, sections, texts])

  const doc = useMemo(() => buildDocument(snap.documentType, snap.sections, snap.texts), [snap])

  return (
    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
      {doc}
    </PDFViewer>
  )
}
