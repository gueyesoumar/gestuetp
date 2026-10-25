import { Document, View } from '@react-pdf/renderer'
import { buildTheme, resolveText } from '../report-kit/theme'
import { ReportPage, Prose } from '../report-kit/components'
import { CR_SECTION_CATALOG, resolveCROptions } from './catalog'
import { CR_CONTENT_SECTIONS, type CRContentSection } from './sections'
import { CRHeader, CRSectionHeader } from './components'
import { decorateCR } from './model'
import type { CRData } from '../interview-cr'
import type { ReportTemplateSection } from '../../../types/database.types'

const DEFAULT_ORDER = CR_SECTION_CATALOG.map((c) => c.key)

// Compte-rendu d'entretien v2 (react-pdf). Ordre/visibilite/libelles pilotes par le
// template (document_type = interview_cr) ; repli sur l'ordre integre. RFC 0021 E2.2.
export function InterviewCRDocument({ data: raw }: { data: CRData & { templateSections?: ReportTemplateSection[] | null; templateTexts?: Record<string, string> | null } }): JSX.Element {
  const data = decorateCR(raw, raw.templateSections, raw.templateTexts)
  const theme = buildTheme(null, null)
  const texts = data.templateTexts ?? null
  const entries = data.templateSections && data.templateSections.length > 0
    ? data.templateSections.filter((x) => x.visible)
    : DEFAULT_ORDER.map((key) => ({ key, visible: true } as ReportTemplateSection))
  const titleOf = (k: string): string => CR_SECTION_CATALOG.find((c) => c.key === k)?.title ?? k
  const leadOf = (k: string): string => CR_SECTION_CATALOG.find((c) => c.key === k)?.lead ?? ''
  type Item =
    | { type: 'catalog'; key: string; Component: CRContentSection['Component']; title: string; lead: string; options: Record<string, unknown> }
    | { type: 'custom'; key: string; title: string; body: string }
  const sections = entries.map((entry): Item | null => {
    if (entry.kind === 'custom') {
      return { type: 'custom', key: entry.key, title: entry.title ?? 'Section', body: entry.body ?? '' }
    }
    const sec = CR_CONTENT_SECTIONS.find((s) => s.key === entry.key)
    if (!sec) return null
    return {
      type: 'catalog', key: sec.key, Component: sec.Component,
      title: resolveText(texts, `${sec.key}.title`, titleOf(sec.key)),
      lead: resolveText(texts, `${sec.key}.lead`, leadOf(sec.key)),
      options: resolveCROptions(sec.key, entry.options),
    }
  }).filter((x): x is Item => x !== null)

  return (
    <Document title={`Compte-rendu - ${data.interview.title}`}>
      <ReportPage cabinetName={data.missionName} headerRight={`Compte-rendu d'entretien ${'·'} ${data.dateStr}`} footerLabel="Compte-rendu d'entretien" theme={theme}>
        <CRHeader data={data} theme={theme} />
        {sections.map((item) => (
          <View key={item.key} {...{ bookmark: item.title }}>
            {item.type === 'custom' ? (
              <View>
                <CRSectionHeader title={item.title} theme={theme} />
                <Prose paragraphs={item.body.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)} />
              </View>
            ) : (
              <item.Component data={data} theme={theme} title={item.title} lead={item.lead} options={item.options} />
            )}
          </View>
        ))}
      </ReportPage>
    </Document>
  )
}
