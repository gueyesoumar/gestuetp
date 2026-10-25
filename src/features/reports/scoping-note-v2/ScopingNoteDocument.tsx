import { Document, View } from '@react-pdf/renderer'
import { buildTheme, resolveText, computeDocRef } from '../report-kit/theme'
import { ReportPage, CustomSection } from '../report-kit/components'
import { SCOPING_SECTION_CATALOG, resolveScopingOptions } from './catalog'
import { SCOPING_CONTENT_SECTIONS, type ScopingContentSection } from './sections'
import { ScopingCover } from './cover'
import { decorateScoping } from './model'
import type { ScopingNoteData } from '../scoping-note/context'
import type { ReportTemplateSection } from '../../../types/database.types'

const DEFAULT_ORDER = SCOPING_SECTION_CATALOG.map((c) => c.key)

// Note de cadrage v2 (react-pdf). Ordre/visibilite/options/libelles pilotes par le
// template (document_type = scoping_note) ; repli sur l'ordre integre. RFC 0021 E2.1.
export function ScopingNoteDocument({ data: raw }: { data: ScopingNoteData & { templateSections?: ReportTemplateSection[] | null; templateTexts?: Record<string, string> | null } }): JSX.Element {
  const data = decorateScoping(raw, raw.templateSections, raw.templateTexts)
  const theme = buildTheme(null, null)
  const texts = data.templateTexts ?? null
  const entries = data.templateSections && data.templateSections.length > 0
    ? data.templateSections.filter((x) => x.visible)
    : DEFAULT_ORDER.map((key) => ({ key, visible: true } as ReportTemplateSection))
  const leadOf = (k: string): string => SCOPING_SECTION_CATALOG.find((c) => c.key === k)?.lead ?? ''
  const titleOf = (k: string): string => SCOPING_SECTION_CATALOG.find((c) => c.key === k)?.title ?? k
  let n = 0
  type Item =
    | { type: 'catalog'; key: string; Component: ScopingContentSection['Component']; num: string; title: string; lead: string; options: Record<string, unknown> }
    | { type: 'custom'; key: string; num: string; title: string; body: string }
  const sections = entries.map((entry): Item | null => {
    if (entry.kind === 'custom') {
      return { type: 'custom', key: entry.key, num: String(++n).padStart(2, '0'), title: entry.title ?? 'Section', body: entry.body ?? '' }
    }
    const sec = SCOPING_CONTENT_SECTIONS.find((s) => s.key === entry.key)
    if (!sec) return null
    return {
      type: 'catalog', key: sec.key, Component: sec.Component, num: String(++n).padStart(2, '0'),
      title: resolveText(texts, `${sec.key}.title`, titleOf(sec.key)),
      lead: resolveText(texts, `${sec.key}.lead`, leadOf(sec.key)),
      options: resolveScopingOptions(sec.key, entry.options),
    }
  }).filter((x): x is Item => x !== null)
  const ref = computeDocRef('NC', data.mission.id, data.mission.start_date)

  return (
    <Document title={`Note de cadrage - ${data.mission.name}`}>
      <ScopingCover data={data} theme={theme} title={resolveText(texts, 'cover.title', 'Note de cadrage')} />
      <ReportPage cabinetName={data.mission.cabinet?.name ?? 'Cabinet'} headerRight={`Note de cadrage ${ref} ${'·'} Confidentiel`} footerLabel="Note de cadrage" theme={theme}>
        {sections.map((item) => (
          <View key={item.key} break={item.num !== '01'} {...{ bookmark: item.title }}>
            {item.type === 'custom'
              ? <CustomSection num={item.num} title={item.title} body={item.body} theme={theme} />
              : <item.Component data={data} theme={theme} num={item.num} title={item.title} lead={item.lead} options={item.options} />}
          </View>
        ))}
      </ReportPage>
    </Document>
  )
}
