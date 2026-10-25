import { Document, View } from '@react-pdf/renderer'
import { buildTheme, resolveText, computeDocRef } from '../report-kit/theme'
import { ReportPage } from '../report-kit/components'
import { SCOPING_SECTION_CATALOG, resolveScopingOptions } from './catalog'
import { SCOPING_CONTENT_SECTIONS, type ScopingContentSection } from './sections'
import { ScopingCover } from './cover'
import { decorateScoping } from './model'
import type { ScopingNoteData } from '../scoping-note/context'

const DEFAULT_ORDER = SCOPING_SECTION_CATALOG.map((c) => c.key)

// Note de cadrage v2 (react-pdf). Ordre/visibilite/options/libelles pilotes par le
// template (document_type = scoping_note) ; repli sur l'ordre integre. RFC 0021 E2.1.
export function ScopingNoteDocument({ data: raw }: { data: ScopingNoteData & { templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null; templateTexts?: Record<string, string> | null } }): JSX.Element {
  const data = decorateScoping(raw, raw.templateSections, raw.templateTexts)
  const theme = buildTheme(null, null)
  const texts = data.templateTexts ?? null
  const order = data.templateSections && data.templateSections.length > 0
    ? data.templateSections.filter((x) => x.visible).map((x) => x.key)
    : DEFAULT_ORDER
  const leadOf = (k: string): string => SCOPING_SECTION_CATALOG.find((c) => c.key === k)?.lead ?? ''
  const titleOf = (k: string): string => SCOPING_SECTION_CATALOG.find((c) => c.key === k)?.title ?? k
  let n = 0
  const sections = order
    .map((k) => SCOPING_CONTENT_SECTIONS.find((s) => s.key === k))
    .filter((s): s is ScopingContentSection => Boolean(s))
    .map((sec) => ({
      sec,
      num: String(++n).padStart(2, '0'),
      title: resolveText(texts, `${sec.key}.title`, titleOf(sec.key)),
      lead: resolveText(texts, `${sec.key}.lead`, leadOf(sec.key)),
      options: resolveScopingOptions(sec.key, data.templateSections?.find((s) => s.key === sec.key)?.options),
    }))
  const ref = computeDocRef('NC', data.mission.id, data.mission.start_date)

  return (
    <Document title={`Note de cadrage - ${data.mission.name}`}>
      <ScopingCover data={data} theme={theme} title={resolveText(texts, 'cover.title', 'Note de cadrage')} />
      <ReportPage cabinetName={data.mission.cabinet?.name ?? 'Cabinet'} headerRight={`Note de cadrage ${ref} ${'·'} Confidentiel`} footerLabel="Note de cadrage" theme={theme}>
        {sections.map(({ sec, num, title, lead, options }) => (
          <View key={sec.key} break={num !== '01'} {...{ bookmark: title }}>
            <sec.Component data={data} theme={theme} num={num} title={title} lead={lead} options={options} />
          </View>
        ))}
      </ReportPage>
    </Document>
  )
}
