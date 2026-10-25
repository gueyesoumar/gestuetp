import { View, Text } from '@react-pdf/renderer'
import { generateActionPlanNarrative, generateConclusionNarrative } from '../auditReportNarratives'
import type { AssessmentWithControl } from '../audit-report/context'
import { Prose, SectionBanner, PdfTable } from './components'
import type { SectionProps } from './sections'

const isFinding = (a: AssessmentWithControl): boolean =>
  a.finding_classification === 'major_nc' || a.finding_classification === 'minor_nc' || a.finding_classification === 'observation'
const sev = (a: AssessmentWithControl): number =>
  a.finding_classification === 'major_nc' ? 0 : a.finding_classification === 'minor_nc' ? 1 : 2
const typeLabel = (a: AssessmentWithControl): string =>
  a.finding_classification === 'major_nc' ? 'NC maj' : a.finding_classification === 'minor_nc' ? 'NC min' : 'Obs.'

export function ActionPlanSection({ data, theme, num, title, lead, options }: SectionProps): JSX.Element {
  const maxRows = typeof options.maxRows === 'number' ? options.maxRows : 40
  const items = data.assessments.filter(isFinding).sort((a, b) => sev(a) - sev(b) || a.control.code.localeCompare(b.control.code))
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={generateActionPlanNarrative(data)} />
      {items.length === 0 ? (
        <Text style={{ fontSize: 10, color: theme.muted }}>Aucune action à inscrire au plan : aucune non-conformité ni observation.</Text>
      ) : (
        <>
          <PdfTable
            theme={theme}
            headers={['Réf.', 'Type', 'Contrôle', 'Constat (extrait)']}
            widths={[16, 12, 40, 56]}
            rows={items.slice(0, maxRows).map((a) => [a.control.code, typeLabel(a), a.control.name, a.findings ?? '-'])}
          />
          {items.length > maxRows ? (
            <Text style={{ fontSize: 8.5, color: theme.muted }}>({items.length - maxRows} action(s) supplémentaire(s) accessibles via l&rsquo;export Excel du plan d&rsquo;action.)</Text>
          ) : null}
        </>
      )}
    </View>
  )
}

export function ConclusionSection({ data, theme, num, title, lead }: SectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={generateConclusionNarrative(data)} />
    </View>
  )
}
