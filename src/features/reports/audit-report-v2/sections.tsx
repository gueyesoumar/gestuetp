import { View, Text, StyleSheet } from '@react-pdf/renderer'
import type { AuditReportData } from '../generateAuditReportPDF'
import { describeVerdict, frameworkLabel, clientLabel } from '../auditReportNarratives'
import { formatDate } from '../audit-report/utils'
import { computeReportRef, type ReportTheme, type ReportTotals } from './report-model'

export interface SectionProps {
  data: AuditReportData
  totals: ReportTotals
  theme: ReportTheme
}

const s = StyleSheet.create({
  coverTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 12 },
  coverEyebrow: { fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  coverClient: { fontSize: 14, color: '#dfe8e3', marginTop: 10 },
  coverMeta: { fontSize: 9, color: '#c7d4cd', marginTop: 4 },
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

export function CoverSection({ data, theme }: SectionProps): JSX.Element {
  const ref = computeReportRef(data.mission.id, data.mission.end_date)
  const fw = frameworkLabel(data)
  const title = fw === 'le référentiel applicable' ? 'Rapport d’audit de conformité' : `Rapport d’audit - ${fw}`
  return (
    <View style={{ flexGrow: 1, backgroundColor: theme.primary, padding: 40, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{data.cabinetName.toUpperCase()}</Text>
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: theme.accent }}>{ref}</Text>
      </View>
      <View>
        <Text style={[s.coverEyebrow, { color: theme.accent }]}>RAPPORT D{'’'}AUDIT</Text>
        <Text style={s.coverTitle}>{title}</Text>
        <Text style={s.coverClient}>{clientLabel(data)}</Text>
        <Text style={s.coverMeta}>Le {formatDate(new Date().toISOString())}</Text>
      </View>
      <Text style={{ fontSize: 8, color: '#c7d4cd' }}>Confidentiel - Diffusion restreinte</Text>
    </View>
  )
}

function Kpi({ label, value, sub, color, theme }: { label: string; value: string; sub: string; color: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={[s.kpi, { borderColor: theme.border }]}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.muted }}>{label.toUpperCase()}</Text>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
      <Text style={[s.kpiSub, { color: theme.muted }]}>{sub}</Text>
    </View>
  )
}

export function SynthesisSection({ totals, theme }: SectionProps): JSX.Element {
  const v = describeVerdict(totals.score, totals.ncMajor)
  const vColor = v.label === 'Favorable' ? '#15803d' : v.label === 'Favorable avec réserves' ? theme.accent : v.label === 'Réservée' ? '#c2410c' : '#b91c1c'
  return (
    <View>
      <Text style={[s.h2, { color: theme.ink }]}>Synthèse exécutive</Text>
      <View style={[s.scoreRow, { backgroundColor: theme.primary }]}>
        <View>
          <Text style={s.scoreLabel}>SCORE DE CONFORMITÉ</Text>
          <Text style={s.scoreNum}>{totals.score}%</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.scoreLabel, { color: theme.accent }]}>OPINION D{'’'}AUDIT</Text>
          <Text style={[s.verdict, { color: vColor }]}>{v.label}</Text>
        </View>
      </View>
      <View style={s.kpiRow}>
        <Kpi label="Contrôles" value={`${totals.total}`} sub="évalués" color={theme.primary} theme={theme} />
        <Kpi label="Conformes" value={`${totals.conformes}`} sub="niveau C" color="#15803d" theme={theme} />
        <Kpi label="NC majeures" value={`${totals.ncMajor}`} sub="à traiter" color="#b91c1c" theme={theme} />
        <Kpi label="NC mineures" value={`${totals.ncMinor}`} sub="à corriger" color="#c2410c" theme={theme} />
      </View>
    </View>
  )
}

/** Registre des sections de CONTENU (hors couverture). Fondation des templates
 *  (D-REP-2) : un template choisira la liste, l'ordre et la visibilite par key. */
export interface ContentSection {
  key: string
  title: string
  Component: (props: SectionProps) => JSX.Element
}

export const CONTENT_SECTIONS: ContentSection[] = [
  { key: 'synthesis', title: 'Synthèse exécutive', Component: SynthesisSection },
]
