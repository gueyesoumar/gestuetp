import { Document, Page, View, StyleSheet } from '@react-pdf/renderer'
import type { AuditReportData } from '../generateAuditReportPDF'
import { buildTheme, decorateData, resolveText } from './report-model'
import { CONTENT_SECTIONS } from './sections'
import { SECTION_CATALOG, resolveOptions } from './section-catalog'
import { CoverSection, ExecutiveLetterSection, SommaireSection } from './front-matter'
import { ReportPage } from './components'
import { CustomSection } from '../report-kit/components'

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
  // Entrees resolues : sections du catalogue ET sections libres (A2), dans l'ordre.
  const entries = data.templateSections && data.templateSections.length > 0
    ? data.templateSections.filter((x) => x.visible)
    : DEFAULT_ORDER.map((key) => ({ key, visible: true } as NonNullable<AuditReportData['templateSections']>[number]))
  // Numerotation derivee de la POSITION : contenu 01,02,... et annexes A,B,...
  const texts = data.templateTexts ?? null
  const leadOf = (k: string): string => SECTION_CATALOG.find((c) => c.key === k)?.lead ?? ''
  let nCount = 0
  let aCount = 0
  type Item =
    | { type: 'catalog'; key: string; Component: typeof CONTENT_SECTIONS[number]['Component']; num: string; title: string; lead: string; options: Record<string, unknown>; bodyOverride?: string }
    | { type: 'custom'; key: string; num: string; title: string; body: string }
  const sections = entries.map((entry): Item | null => {
    if (entry.kind === 'custom') {
      return { type: 'custom', key: entry.key, num: String(++nCount).padStart(2, '0'), title: entry.title ?? 'Section', body: entry.body ?? '' }
    }
    const sec = CONTENT_SECTIONS.find((s) => s.key === entry.key)
    if (!sec) return null
    const num = sec.key.startsWith('annex_') ? String.fromCharCode(65 + aCount++) : String(++nCount).padStart(2, '0')
    return {
      type: 'catalog', key: sec.key, Component: sec.Component, num,
      title: resolveText(texts, `${sec.key}.title`, sec.title),
      lead: resolveText(texts, `${sec.key}.lead`, leadOf(sec.key)),
      options: resolveOptions(sec.key, entry.options),
      bodyOverride: texts?.[`${sec.key}.body`],
    }
  }).filter((x): x is Item => x !== null)
  const sommaire = [{ num: '', title: 'Lettre au comité d’audit' }, ...sections.map((x) => ({ num: x.num, title: x.title }))]

  return (
    <Document title={`Rapport d'audit - ${data.mission.name}`}>
      <Page size="A4" style={page.cover}>
        <CoverSection data={data} theme={theme} texts={texts} />
      </Page>
      <ReportPage data={data} theme={theme} footerLabel="Rapport d’audit">
        <View {...{ bookmark: 'Lettre au comité d’audit' }}>
          <ExecutiveLetterSection data={data} theme={theme} texts={texts} />
        </View>
        <View break {...{ bookmark: 'Sommaire' }}>
          <SommaireSection entries={sommaire} theme={theme} />
        </View>
        {sections.map((item) => (
          <View key={item.key} break {...{ bookmark: item.title }}>
            {item.type === 'custom'
              ? <CustomSection num={item.num} title={item.title} body={item.body} theme={theme} />
              : <item.Component data={data} theme={theme} num={item.num} title={item.title} lead={item.lead} options={item.options} bodyOverride={item.bodyOverride} />}
          </View>
        ))}
      </ReportPage>
    </Document>
  )
}
