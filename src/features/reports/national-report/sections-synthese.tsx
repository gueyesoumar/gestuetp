import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import { SectionBanner, H3, Prose } from '../report-kit/components'
import type { NationalReportInput, ReportVariant } from './model'
import { pct, decisionsFor } from './model'

function KpiCard({ v, k, theme, last }: { v: string; k: string; theme: ReportTheme; last?: boolean }): JSX.Element {
  return (
    <View style={{ flex: 1, padding: 9, borderRightWidth: last ? 0 : 0.5, borderRightColor: theme.border }}>
      <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{v}</Text>
      <Text style={{ fontSize: 7, color: theme.muted, marginTop: 2, lineHeight: 1.3 }}>{k}</Text>
    </View>
  )
}

export function SyntheseSection({ input, theme, num, variant }: { input: NationalReportInput; theme: ReportTheme; num: string; variant: ReportVariant }): JSX.Element {
  const r = input.regul; const k = input.risk
  const kpis: { v: string; k: string }[] = [{ v: `${r.perimeter.assujettis}`, k: `Assujettis supervisés, dont ${r.perimeter.vitales} vitales` }]
  if (variant !== 'risk') kpis.push({ v: pct(r.conformity.overall), k: 'Conformité moyenne' })
  if (variant !== 'regul') kpis.push({ v: `${k.exposure.national_avg}/100`, k: 'Exposition nationale moyenne' })
  if (variant !== 'regul') kpis.push({ v: `${k.vitales.exposed}/${k.vitales.total}`, k: 'Vitales en exposition élevée' })
  if (variant !== 'risk') kpis.push({ v: `${r.measures.total}`, k: 'Mesures émises' })
  const decisions = decisionsFor(variant).map((d, i) => `${i + 1}. ${d.short}`)
  return (
    <View>
      <SectionBanner num={num} title="Synthèse exécutive" lead="La posture nationale en un coup d'œil" theme={theme} />
      <View style={{ borderWidth: 0.5, borderColor: theme.border, borderRadius: 3, flexDirection: 'row' }}>
        {kpis.map((kp, i) => <KpiCard key={i} v={kp.v} k={kp.k} theme={theme} last={i === kpis.length - 1} />)}
      </View>

      <View style={{ marginTop: 14, backgroundColor: theme.primary, borderRadius: 3, padding: 12 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Posture nationale : fragile, mais en progression.</Text>
        <Text style={{ fontSize: 8.5, color: '#c7d4cd', marginTop: 4, lineHeight: 1.5 }}>La supervision s&rsquo;étend et se durcit ; l&rsquo;exposition reste élevée sur les infrastructures vitales. La bonne gouvernance se mesure à la capacité d&rsquo;anticiper, détecter et réagir, non à l&rsquo;absence d&rsquo;attaques.</Text>
      </View>

      <H3 theme={theme}>Les décisions attendues</H3>
      <Prose paragraphs={decisions} />
    </View>
  )
}
