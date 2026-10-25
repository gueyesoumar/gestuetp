import { Document, Page, View, StyleSheet } from '@react-pdf/renderer'
import type { AuditReportData } from '../generateAuditReportPDF'
import { buildTheme, decorateData } from './report-model'
import { CONTENT_SECTIONS, type ContentSection } from './sections'
import { CoverSection, ExecutiveLetterSection, SommaireSection } from './front-matter'
import { ReportPage } from './components'

const page = StyleSheet.create({ cover: { padding: 0 } })

// Lot 2a : couverture + lettre + sommaire + chrome. L'ordre des sections de contenu
// deviendra pilote par template (D-REP-2). Les sections 2b/2c s'ajoutent ici.
const DEFAULT_ORDER: string[] = [
  'context', 'methodology', 'synthesis', 'domains', 'nc_fiches', 'recommendations',
  'action_plan', 'conclusion',
  'annex_glossary', 'annex_evidence', 'annex_references', 'annex_distribution',
]

export function AuditReportDocument({ data: raw }: { data: AuditReportData }): JSX.Element {
  const data = decorateData(raw)
  const theme = buildTheme(data)
  // Ordre/visibilite : template resolu (RFC 0021 Lot 3) sinon ordre integre par defaut.
  const order = data.templateSections && data.templateSections.length > 0
    ? data.templateSections.filter((x) => x.visible).map((x) => x.key)
    : DEFAULT_ORDER
  const resolved = order
    .map((k) => CONTENT_SECTIONS.find((sec) => sec.key === k))
    .filter((sec): sec is ContentSection => Boolean(sec))
  // Numerotation derivee de la POSITION (et non codee en dur) : les sections de
  // contenu sont numerotees 01,02,... et les annexes lettrees A,B,... selon leur
  // ordre resolu (template compris).
  let nCount = 0
  let aCount = 0
  const sections = resolved.map((sec) => ({
    sec,
    num: sec.key.startsWith('annex_') ? String.fromCharCode(65 + aCount++) : String(++nCount).padStart(2, '0'),
  }))
  const sommaire = ['Lettre au comité d’audit', ...sections.map((x) => x.sec.title)]

  return (
    <Document title={`Rapport d'audit - ${data.mission.name}`}>
      <Page size="A4" style={page.cover}>
        <CoverSection data={data} theme={theme} />
      </Page>
      <ReportPage data={data} theme={theme} footerLabel="Rapport d’audit">
        <View {...{ bookmark: 'Lettre au comité d’audit' }}>
          <ExecutiveLetterSection data={data} theme={theme} />
        </View>
        <View break {...{ bookmark: 'Sommaire' }}>
          <SommaireSection entries={sommaire} theme={theme} />
        </View>
        {sections.map(({ sec, num }) => (
          <View key={sec.key} break {...{ bookmark: sec.title }}>
            <sec.Component data={data} theme={theme} num={num} />
          </View>
        ))}
      </ReportPage>
    </Document>
  )
}
