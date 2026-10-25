import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { generateRecommendationNarrative } from '../auditReportNarratives'
import type { AssessmentWithControl } from '../audit-report/context'
import { Prose, SectionBanner, H3 } from './components'
import { PriorityMatrix } from './charts'
import type { ReportTheme } from './report-model'
import type { SectionProps } from './sections'

const r = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3, padding: 8, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  num: { width: 16, height: 16, borderRadius: 3, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  numTxt: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  prio: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, marginRight: 8 },
  prioTxt: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  title: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  reco: { fontSize: 9, lineHeight: 1.45, color: '#374151' },
})

const isFinding = (a: AssessmentWithControl): boolean =>
  a.finding_classification === 'major_nc' || a.finding_classification === 'minor_nc' || a.finding_classification === 'observation'
const severity = (a: AssessmentWithControl): number =>
  a.finding_classification === 'major_nc' ? 0 : a.finding_classification === 'minor_nc' ? 1 : 2

function RecoCard({ a, idx, theme }: { a: AssessmentWithControl; idx: number; theme: ReportTheme }): JSX.Element {
  const priority = a.finding_classification === 'major_nc' ? 'P1' : a.finding_classification === 'minor_nc' ? 'P2' : 'P3'
  const color = priority === 'P1' ? '#b91c1c' : priority === 'P2' ? '#c2410c' : '#2563eb'
  return (
    <View style={r.card} wrap={false}>
      <View style={r.head}>
        <View style={[r.num, { backgroundColor: theme.primary }]}><Text style={r.numTxt}>{idx}</Text></View>
        <View style={[r.prio, { backgroundColor: color }]}><Text style={r.prioTxt}>{priority}</Text></View>
        <Text style={[r.title, { color: theme.ink }]}>{a.control.code} : {a.control.name}</Text>
      </View>
      <Text style={r.reco}>{a.recommendations ?? '-'}</Text>
    </View>
  )
}

export function RecommendationsSection({ data, theme, num, title, lead }: SectionProps): JSX.Element {
  const items = data.assessments.filter(isFinding)
  const top = items.filter((a) => (a.recommendations ?? '').trim().length > 0).sort((a, b) => severity(a) - severity(b)).slice(0, 10)
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={generateRecommendationNarrative(data)} />
      {items.length === 0 ? (
        <Text style={{ fontSize: 10, color: theme.muted }}>Aucune recommandation à hiérarchiser à ce stade.</Text>
      ) : (
        <>
          <H3 theme={theme}>Matrice impact x effort</H3>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <PriorityMatrix items={items} data={data} />
          </View>
          {top.length > 0 && (
            <>
              <H3 theme={theme}>Top 10 recommandations</H3>
              {top.map((a, i) => <RecoCard key={a.id} a={a} idx={i + 1} theme={theme} />)}
            </>
          )}
        </>
      )}
    </View>
  )
}
