import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { describeVerdict } from '../auditReportNarratives'
import type { DecoratedData, ReportTheme } from './report-model'

export interface SectionProps {
  data: DecoratedData
  theme: ReportTheme
}

const s = StyleSheet.create({
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 4, marginBottom: 14 },
  scoreNum: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  scoreLabel: { fontSize: 8, color: '#dfe8e3' },
  verdict: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderRadius: 4, padding: 8 },
  kpiVal: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  kpiSub: { fontSize: 7, marginTop: 2 },
})

export function Kpi({ label, value, sub, color, theme }: { label: string; value: string; sub: string; color: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={[s.kpi, { borderColor: theme.border }]}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.muted }}>{label.toUpperCase()}</Text>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
      <Text style={[s.kpiSub, { color: theme.muted }]}>{sub}</Text>
    </View>
  )
}

export function SynthesisSection({ data, theme }: SectionProps): JSX.Element {
  const t = data.totals
  const v = describeVerdict(t.conformityScore, t.ncMajor)
  const vColor = v.label === 'Favorable' ? '#15803d' : v.label === 'Favorable avec réserves' ? theme.accent : v.label === 'Réservée' ? '#c2410c' : '#b91c1c'
  return (
    <View>
      <Text style={[s.h2, { color: theme.ink }]}>Synthèse exécutive</Text>
      <View style={[s.scoreRow, { backgroundColor: theme.primary }]}>
        <View>
          <Text style={s.scoreLabel}>SCORE DE CONFORMITÉ</Text>
          <Text style={s.scoreNum}>{t.conformityScore}%</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.scoreLabel, { color: theme.accent }]}>OPINION D{'’'}AUDIT</Text>
          <Text style={[s.verdict, { color: vColor }]}>{v.label}</Text>
        </View>
      </View>
      <View style={s.kpiRow}>
        <Kpi label="Contrôles" value={`${t.totalControls}`} sub="évalués" color={theme.primary} theme={theme} />
        <Kpi label="Conformes" value={`${t.conformes}`} sub="niveau C" color="#15803d" theme={theme} />
        <Kpi label="NC majeures" value={`${t.ncMajor}`} sub="à traiter" color="#b91c1c" theme={theme} />
        <Kpi label="NC mineures" value={`${t.ncMinor}`} sub="à corriger" color="#c2410c" theme={theme} />
      </View>
    </View>
  )
}

/** Registre des sections de CONTENU (hors front-matter). Fondation des templates
 *  (D-REP-2) : un template choisira la liste, l'ordre et la visibilite par key. */
export interface ContentSection {
  key: string
  title: string
  Component: (props: SectionProps) => JSX.Element
}

export const CONTENT_SECTIONS: ContentSection[] = [
  { key: 'synthesis', title: 'Synthèse exécutive', Component: SynthesisSection },
]
