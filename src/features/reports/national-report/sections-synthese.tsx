import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import { SectionBanner, H3, Prose } from '../report-kit/components'
import type { NationalReportInput } from './model'
import { pct } from './model'

function KpiCard({ v, k, theme }: { v: string; k: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ flex: 1, padding: 9, borderRightWidth: 0.5, borderRightColor: theme.border }}>
      <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{v}</Text>
      <Text style={{ fontSize: 7, color: theme.muted, marginTop: 2, lineHeight: 1.3 }}>{k}</Text>
    </View>
  )
}

export function SyntheseSection({ input, theme, num }: { input: NationalReportInput; theme: ReportTheme; num: string }): JSX.Element {
  const r = input.regul; const k = input.risk
  return (
    <View>
      <SectionBanner num={num} title="Synthèse exécutive" lead="La posture nationale en un coup d'œil" theme={theme} />
      <View style={{ borderWidth: 0.5, borderColor: theme.border, borderRadius: 3, flexDirection: 'row' }}>
        <KpiCard v={`${r.perimeter.assujettis}`} k={`Assujettis supervisés, dont ${r.perimeter.vitales} vitales`} theme={theme} />
        <KpiCard v={pct(r.conformity.overall)} k="Conformité moyenne" theme={theme} />
        <KpiCard v={`${k.exposure.national_avg}/100`} k="Exposition nationale moyenne" theme={theme} />
        <KpiCard v={`${k.vitales.exposed}/${k.vitales.total}`} k="Vitales en exposition élevée" theme={theme} />
        <View style={{ flex: 1, padding: 9 }}>
          <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{r.measures.total}</Text>
          <Text style={{ fontSize: 7, color: theme.muted, marginTop: 2 }}>Mesures émises</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, backgroundColor: theme.primary, borderRadius: 3, padding: 12 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Posture nationale : fragile, mais en progression.</Text>
        <Text style={{ fontSize: 8.5, color: '#c7d4cd', marginTop: 4, lineHeight: 1.5 }}>La supervision s&rsquo;étend et se durcit ; l&rsquo;exposition reste élevée sur les infrastructures vitales. La bonne gouvernance se mesure à la capacité d&rsquo;anticiper, détecter et réagir, non à l&rsquo;absence d&rsquo;attaques.</Text>
      </View>

      <H3 theme={theme}>Les trois décisions attendues</H3>
      <Prose paragraphs={[
        '1. Doter l’autorité d’un cadre légal contraignant (signalement obligatoire, sanctions).',
        '2. Lancer un plan d’urgence sur les infrastructures vitales en exposition élevée.',
        '3. Investir dans la capacité nationale de cyber-résilience.',
      ]} />
    </View>
  )
}
