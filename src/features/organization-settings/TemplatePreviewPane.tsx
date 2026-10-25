import { useEffect, useMemo, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { AuditReportDocument } from '../reports/audit-report-v2/AuditReportDocument'
import { buildSampleReportData } from '../reports/audit-report-v2/sampleReportData'

interface Props {
  sections: { key: string; visible: boolean; options: Record<string, unknown> }[]
  texts: Record<string, string>
}

// Apercu live de l'editeur de modeles (RFC 0021 D1). Rendu 100 % client sur des
// donnees FACTICES ; charge en React.lazy par le modal pour que react-pdf reste
// hors du bundle d'OrganizationPage. Debounce interne : on ne recompile le PDF
// qu'a l'arret des modifications (frappe/reordonnancement).
export default function TemplatePreviewPane({ sections, texts }: Props): JSX.Element {
  const [snap, setSnap] = useState<Props>(() => ({ sections, texts }))
  useEffect(() => {
    const t = setTimeout(() => setSnap({ sections, texts }), 450)
    return () => clearTimeout(t)
  }, [sections, texts])

  const data = useMemo(() => {
    const base = buildSampleReportData()
    return {
      ...base,
      templateSections: snap.sections,
      templateTexts: Object.keys(snap.texts).length > 0 ? snap.texts : null,
    }
  }, [snap])

  return (
    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
      <AuditReportDocument data={data} />
    </PDFViewer>
  )
}
