import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import { formatDate, generateContextSummary } from '../scoping-note/narratives'
import type { ScopingDecoratedData } from './model'

const c = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', color: '#1a2e23' },
  hero: { paddingTop: 30, paddingBottom: 26, paddingHorizontal: 40 },
  rule: { height: 2 },
  wordmark: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 16 },
  subtitle: { fontSize: 11, color: '#dfe8e3', marginTop: 6 },
  body: { paddingHorizontal: 40, paddingTop: 18 },
  kpiRow: { flexDirection: 'row', borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 3 },
  kpi: { flex: 1, padding: 10, borderRightWidth: 0.5, borderRightColor: '#e5e7eb' },
})

function Kpi({ label, value, sub, theme }: { label: string; value: string; sub: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={c.kpi}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.muted }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{value}</Text>
      <Text style={{ fontSize: 7, color: theme.muted, marginTop: 1 }}>{sub}</Text>
    </View>
  )
}

export function ScopingCover({ data, theme, title }: { data: ScopingDecoratedData; theme: ReportTheme; title: string }): JSX.Element {
  const fw = `${data.mission.framework?.name ?? '-'}${data.mission.framework?.version ? ' v' + data.mission.framework.version : ''}`
  const clientName = data.client?.client_name ?? data.mission.client?.name ?? '-'
  const meta = [data.client?.client_sector, data.client?.effectifs ? `${data.client.effectifs} collaborateurs` : null, data.client?.client_country].filter(Boolean).join(' · ')
  return (
    <Page size="A4" style={c.page}>
      <View style={[c.hero, { backgroundColor: theme.primary }]}>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: theme.accent }}>{`MISSION · ${data.mission.id.slice(0, 8)} · v1.0`}</Text>
        <Text style={[c.wordmark, { color: '#ffffff', marginTop: 10 }]}>Gëstu <Text style={{ fontSize: 8, color: theme.accent }}>COMPLY</Text></Text>
        <Text style={c.title}>{title}</Text>
        <Text style={c.subtitle}>Évaluation de la conformité aux exigences du référentiel {fw}.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{(clientName[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{clientName}</Text>
            <Text style={{ fontSize: 8.5, color: '#c7d4cd' }}>{meta || '-'}</Text>
          </View>
        </View>
      </View>
      <View style={[c.rule, { backgroundColor: theme.accent }]} />

      <View style={c.body}>
        <View style={c.kpiRow}>
          <Kpi label="Contrôles" value={`${data.includedControls}`} sub={`/ ${data.totalControls}`} theme={theme} />
          <Kpi label="Domaines" value={`${data.domains.length}`} sub="évalués" theme={theme} />
          <Kpi label="Équipe" value={`${data.members.length}`} sub="membres" theme={theme} />
          <View style={[c.kpi, { borderRightWidth: 0 }]}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.muted }}>DURÉE</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{data.durationWeeks}</Text>
            <Text style={{ fontSize: 7, color: theme.muted, marginTop: 1 }}>semaines</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: theme.muted }}>CABINET D&rsquo;AUDIT</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: theme.ink, marginTop: 4 }}>{data.mission.cabinet?.name ?? '-'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: theme.muted }}>CONTEXTE DE LA MISSION</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#374151', marginTop: 4 }}>{generateContextSummary(data)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, borderRadius: 2, backgroundColor: '#fdf8e8', padding: 8 }}>
          <Text style={{ fontSize: 8, color: theme.accent }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>CONFIDENTIEL</Text> · Distribution restreinte aux parties prenantes de la mission</Text>
        </View>
        <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 10 }}>Document généré le {formatDate(new Date().toISOString())}</Text>
      </View>
    </Page>
  )
}
