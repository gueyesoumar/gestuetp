import { Document, Page, View, StyleSheet } from '@react-pdf/renderer'
import type { AuditReportData } from '../generateAuditReportPDF'
import { buildTheme, computeTotals } from './report-model'
import { CoverSection, CONTENT_SECTIONS, type ContentSection } from './sections'

const page = StyleSheet.create({
  cover: { padding: 0 },
  content: { paddingVertical: 36, paddingHorizontal: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a2e23' },
})

// Lot 1 (coquille) : couverture + synthese. L'ordre deviendra pilote par template (D-REP-2).
const DEFAULT_ORDER: string[] = ['synthesis']

export function AuditReportDocument({ data }: { data: AuditReportData }): JSX.Element {
  const theme = buildTheme(data)
  const totals = computeTotals(data.assessments)
  const sections = DEFAULT_ORDER
    .map((k) => CONTENT_SECTIONS.find((sec) => sec.key === k))
    .filter((sec): sec is ContentSection => Boolean(sec))

  return (
    <Document title={`Rapport d'audit - ${data.mission.name}`}>
      <Page size="A4" style={page.cover}>
        <CoverSection data={data} totals={totals} theme={theme} />
      </Page>
      <Page size="A4" style={page.content}>
        {sections.map((sec) => (
          <View key={sec.key}>
            <sec.Component data={data} totals={totals} theme={theme} />
          </View>
        ))}
      </Page>
    </Document>
  )
}
