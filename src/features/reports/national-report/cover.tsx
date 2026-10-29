import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import type { NationalReportInput } from './model'

const TITLES: Record<string, string> = {
  global: "État de la cybersécurité de l'État",
  regul: "Supervision réglementaire de la cybersécurité de l'État",
  risk: "Exposition au risque cyber de l'État",
}

const c = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', color: '#1a2e23' },
  hero: { paddingTop: 34, paddingBottom: 28, paddingHorizontal: 44 },
  rule: { height: 2 },
  title: { fontSize: 25, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 16, maxWidth: 420 },
  subtitle: { fontSize: 10.5, color: '#dfe8e3', marginTop: 8, lineHeight: 1.4, maxWidth: 440 },
  body: { paddingHorizontal: 44, paddingTop: 22, flex: 1 },
  metaRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  metaK: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  metaV: { fontSize: 10, color: '#1a2e23', marginTop: 3 },
})

export function NationalCover({ input, theme }: { input: NationalReportInput; theme: ReportTheme }): JSX.Element {
  return (
    <Page size="A4" style={c.page}>
      <View style={[c.hero, { backgroundColor: theme.primary }]}>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: theme.accent }}>AUTORITÉ NATIONALE DE CYBERSÉCURITÉ</Text>
        <Text style={c.title}>{TITLES[input.variant]}</Text>
        <Text style={c.subtitle}>Rapport de supervision nationale. Posture de conformité et d&rsquo;exposition au risque, et décisions soumises à l&rsquo;arbitrage.</Text>
      </View>
      <View style={[c.rule, { backgroundColor: theme.accent }]} />

      <View style={c.body}>
        <View style={{ borderWidth: 0.5, borderColor: theme.border, borderRadius: 3, padding: 14 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: theme.ink }}>À l&rsquo;attention de Monsieur le Président de la République</Text>
          <View style={[c.metaRow, { marginTop: 14 }]}>
            <View style={{ flex: 1 }}><Text style={c.metaK}>AUTORITÉ ÉMETTRICE</Text><Text style={c.metaV}>{input.authorityName}</Text></View>
            <View style={{ flex: 1 }}><Text style={c.metaK}>PÉRIODE</Text><Text style={c.metaV}>{input.periodLabel}</Text></View>
          </View>
          <View style={[c.metaRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}><Text style={c.metaK}>RÉFÉRENCE</Text><Text style={c.metaV}>ANC / RAP / {new Date(input.generatedAt).getFullYear()}</Text></View>
            <View style={{ flex: 1 }}><Text style={c.metaK}>DATE D&rsquo;ÉDITION</Text><Text style={c.metaV}>{new Date(input.generatedAt).toLocaleDateString('fr-FR')}</Text></View>
          </View>
        </View>

        <View style={{ marginTop: 20, borderRadius: 2, backgroundColor: '#fdf8e8', padding: 9 }}>
          <Text style={{ fontSize: 8, color: theme.accent }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>CONFIDENTIEL</Text> · Diffusion restreinte. Reproduction interdite.</Text>
        </View>
        <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 10 }}>Document produit par Gëstu ETP à partir des données de supervision de l&rsquo;autorité.</Text>
      </View>
    </Page>
  )
}
