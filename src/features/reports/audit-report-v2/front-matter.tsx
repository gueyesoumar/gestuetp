import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { frameworkLabel, clientLabel, generateExecutiveLetterBody } from '../auditReportNarratives'
import { formatDate, formatPeriodShort } from '../audit-report/utils'
import { Prose } from './components'
import { computeReportRef, resolveText, type DecoratedData, type ReportTheme } from './report-model'

type Texts = Record<string, string> | null

const f = StyleSheet.create({
  cover: { flexGrow: 1, padding: 40, justifyContent: 'space-between' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coverName: { flex: 1, fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  coverRef: { flexShrink: 0, marginLeft: 16, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  eyebrow: { fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 12 },
  client: { fontSize: 14, color: '#dfe8e3', marginTop: 10 },
  meta: { fontSize: 9, color: '#c7d4cd', marginTop: 4 },
  conf: { fontSize: 8, color: '#c7d4cd' },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  letterDate: { fontSize: 9, color: '#6b7280', textAlign: 'right', marginBottom: 10 },
  recipient: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  recipientSub: { fontSize: 8.5, color: '#6b7280', marginBottom: 12 },
  sign: { fontSize: 9, color: '#374151', marginTop: 10 },
  somItem: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.4, borderBottomColor: '#e5e7eb' },
  somNum: { width: 22, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  somLabel: { fontSize: 10, color: '#374151' },
})

export function CoverSection({ data, theme, texts }: { data: DecoratedData; theme: ReportTheme; texts: Texts }): JSX.Element {
  const ref = computeReportRef(data.mission.id, data.mission.end_date)
  const fw = frameworkLabel(data)
  const title = fw === 'le référentiel applicable' ? 'Rapport d’audit de conformité' : `Rapport d’audit - ${fw}`
  return (
    <View style={[f.cover, { backgroundColor: theme.primary }]}>
      <View style={f.coverTop}>
        <Text style={[f.coverName, { maxLines: 2 }]}>{data.cabinetName.toUpperCase()}</Text>
        <Text style={[f.coverRef, { color: theme.accent }]}>{ref}</Text>
      </View>
      <View>
        <Text style={[f.eyebrow, { color: theme.accent }]}>{resolveText(texts, 'cover.eyebrow', 'RAPPORT D’AUDIT')}</Text>
        <Text style={f.title}>{title}</Text>
        <Text style={f.client}>{clientLabel(data)}</Text>
        <Text style={f.meta}>Période d{'’'}audit : {formatPeriodShort(data.mission.start_date, data.mission.end_date)}</Text>
        <Text style={f.meta}>Émis le {formatDate(new Date().toISOString())}</Text>
      </View>
      <Text style={f.conf}>{resolveText(texts, 'cover.confidentiality', 'Confidentiel - Diffusion restreinte')}</Text>
    </View>
  )
}

export function ExecutiveLetterSection({ data, theme, texts }: { data: DecoratedData; theme: ReportTheme; texts: Texts }): JSX.Element {
  const lead = data.members.find((m) => m.role === 'lead_auditor')
  const lu = lead ? (lead as unknown as { user?: { first_name?: string; last_name?: string; job_title?: string } }).user : null
  const signatory = lu ? `${lu.first_name ?? ''} ${lu.last_name ?? ''}`.trim() : ''
  return (
    <View>
      <Text style={[f.h2, { color: theme.ink }]}>Lettre au comité d{'’'}audit</Text>
      <View style={{ height: 2, width: 40, backgroundColor: theme.accent, marginBottom: 10 }} />
      <Text style={f.letterDate}>Le {formatDate(new Date().toISOString())}</Text>
      <Text style={f.recipient}>Direction de {clientLabel(data)}</Text>
      <Text style={f.recipientSub}>Comité d{'’'}audit et instances de gouvernance</Text>
      <Prose paragraphs={generateExecutiveLetterBody(data)} />
      <Text style={f.sign}>Pour {data.cabinetName},</Text>
      <Text style={f.sign}>{resolveText(texts, 'letter.closing', 'L’équipe d’audit')}</Text>
      {signatory ? (
        <Text style={[f.sign, { fontFamily: 'Helvetica-Bold', marginTop: 10 }]}>
          {signatory}{lu?.job_title ? ` - ${lu.job_title}` : ''}
        </Text>
      ) : null}
    </View>
  )
}

export function SommaireSection({ entries, theme }: { entries: string[]; theme: ReportTheme }): JSX.Element {
  return (
    <View>
      <Text style={[f.h2, { color: theme.ink, marginBottom: 10 }]}>Sommaire</Text>
      {entries.map((label, i) => (
        <View key={i} style={f.somItem}>
          <Text style={[f.somNum, { color: theme.accent }]}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={f.somLabel}>{label}</Text>
        </View>
      ))}
    </View>
  )
}
