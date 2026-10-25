import { Document, View } from '@react-pdf/renderer'
import { buildTheme, resolveText } from '../report-kit/theme'
import { ReportPage } from '../report-kit/components'
import { CR_SECTION_CATALOG, resolveCROptions } from './catalog'
import { CR_CONTENT_SECTIONS, type CRContentSection } from './sections'
import { CRHeader } from './components'
import { decorateCR } from './model'
import type { CRData } from '../interview-cr'

const DEFAULT_ORDER = CR_SECTION_CATALOG.map((c) => c.key)

// Compte-rendu d'entretien v2 (react-pdf). Ordre/visibilite/libelles pilotes par le
// template (document_type = interview_cr) ; repli sur l'ordre integre. RFC 0021 E2.2.
export function InterviewCRDocument({ data: raw }: { data: CRData & { templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null; templateTexts?: Record<string, string> | null } }): JSX.Element {
  const data = decorateCR(raw, raw.templateSections, raw.templateTexts)
  const theme = buildTheme(null, null)
  const texts = data.templateTexts ?? null
  const order = data.templateSections && data.templateSections.length > 0
    ? data.templateSections.filter((x) => x.visible).map((x) => x.key)
    : DEFAULT_ORDER
  const titleOf = (k: string): string => CR_SECTION_CATALOG.find((c) => c.key === k)?.title ?? k
  const leadOf = (k: string): string => CR_SECTION_CATALOG.find((c) => c.key === k)?.lead ?? ''
  const sections = order
    .map((k) => CR_CONTENT_SECTIONS.find((s) => s.key === k))
    .filter((s): s is CRContentSection => Boolean(s))
    .map((sec) => ({
      sec,
      title: resolveText(texts, `${sec.key}.title`, titleOf(sec.key)),
      lead: resolveText(texts, `${sec.key}.lead`, leadOf(sec.key)),
      options: resolveCROptions(sec.key, data.templateSections?.find((s) => s.key === sec.key)?.options),
    }))

  return (
    <Document title={`Compte-rendu - ${data.interview.title}`}>
      <ReportPage cabinetName={data.missionName} headerRight={`Compte-rendu d'entretien ${'·'} ${data.dateStr}`} footerLabel="Compte-rendu d'entretien" theme={theme}>
        <CRHeader data={data} theme={theme} />
        {sections.map(({ sec, title, lead, options }) => (
          <View key={sec.key} {...{ bookmark: title }}>
            <sec.Component data={data} theme={theme} title={title} lead={lead} options={options} />
          </View>
        ))}
      </ReportPage>
    </Document>
  )
}
