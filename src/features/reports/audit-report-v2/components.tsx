import type { ReactNode } from 'react'
import type { AuditReportData } from '../generateAuditReportPDF'
import { computeReportRef, type ReportTheme } from './report-model'
import { ReportPage as KitReportPage } from '../report-kit/components'

// Primitives du rapport v2 : les generiques viennent du socle partage (report-kit).
// Seul ReportPage reste un adaptateur specifique (en-tete/pied derives des donnees
// du rapport d'audit).
export { Prose, SectionBanner, H3, PdfTable, Field } from '../report-kit/components'

/** Page de contenu du rapport d'audit : en-tete « Rapport AUD-... Confidentiel »,
 *  pied = texte cabinet dormant sinon libelle de section. */
export function ReportPage({ data, theme, footerLabel, children }: {
  data: AuditReportData
  theme: ReportTheme
  footerLabel?: string
  children: ReactNode
}): JSX.Element {
  const ref = computeReportRef(data.mission.id, data.mission.end_date)
  return (
    <KitReportPage
      cabinetName={data.cabinetName}
      headerRight={`Rapport ${ref} ${'·'} Confidentiel`}
      footerText={data.cabinetFooterText}
      footerLabel={footerLabel}
      theme={theme}
    >
      {children}
    </KitReportPage>
  )
}
