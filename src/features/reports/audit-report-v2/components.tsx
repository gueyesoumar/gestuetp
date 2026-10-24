import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { AuditReportData } from '../generateAuditReportPDF'
import { computeReportRef, type ReportTheme } from './report-model'

// Primitives react-pdf partagees du rapport v2.

const st = StyleSheet.create({
  page: { paddingTop: 52, paddingBottom: 44, paddingHorizontal: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a2e23' },
  header: { position: 'absolute', top: 22, left: 40, right: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerName: { flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  headerRef: { flexShrink: 0, marginLeft: 16, fontSize: 7.5, color: '#6b7280' },
  rule: { marginTop: 4, height: 0.8 },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.4, borderTopColor: '#e5e7eb', paddingTop: 5 },
  footerText: { fontSize: 7, color: '#6b7280' },
  watermark: { position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center', fontSize: 64, fontFamily: 'Helvetica-Bold', color: '#1a2e23', opacity: 0.045 },
  para: { fontSize: 10, lineHeight: 1.5, color: '#374151', marginBottom: 6 },
})

/** Page de contenu avec en-tete, pied et pagination repetes (elements `fixed`),
 *  et filigrane discret. La couverture n'utilise PAS ce wrapper. */
export function ReportPage({ data, theme, footerLabel, children }: {
  data: AuditReportData
  theme: ReportTheme
  footerLabel?: string
  children: ReactNode
}): JSX.Element {
  const ref = computeReportRef(data.mission.id, data.mission.end_date)
  return (
    <Page size="A4" style={st.page}>
      <View fixed style={st.header}>
        <View style={st.headerRow}>
          <Text style={[st.headerName, { color: theme.primary, maxLines: 1 }]}>{data.cabinetName.toUpperCase()}</Text>
          <Text style={st.headerRef}>Rapport {ref} {'·'} Confidentiel</Text>
        </View>
        <View style={[st.rule, { backgroundColor: theme.accent }]} />
      </View>

      <Text fixed style={st.watermark}>CONFIDENTIEL</Text>

      {children}

      <View fixed style={st.footer}>
        <Text style={st.footerText}>{footerLabel ?? ''}</Text>
        <Text style={st.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  )
}

/** Rend une liste de paragraphes (prose issue de auditReportNarratives). */
export function Prose({ paragraphs }: { paragraphs: string[] }): JSX.Element {
  return (
    <>
      {paragraphs.map((p, i) => <Text key={i} style={st.para}>{p}</Text>)}
    </>
  )
}

/** Bandeau de section numerote (numero + titre + chapeau), comme le moteur v1. */
export function SectionBanner({ num, title, lead, theme }: { num: string; title: string; lead?: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      <View style={{ backgroundColor: theme.primary, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: theme.accent, marginRight: 12 }}>{num}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{title}</Text>
          {lead ? <Text style={{ fontSize: 8.5, color: '#c7d4cd', marginTop: 2 }}>{lead}</Text> : null}
        </View>
      </View>
      <View style={{ height: 1.5, backgroundColor: theme.accent }} />
    </View>
  )
}

/** Sous-titre avec filet dore court. */
export function H3({ children, theme }: { children: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      <Text style={{ fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: theme.ink }}>{children}</Text>
      <View style={{ height: 0.8, width: 28, backgroundColor: theme.accent, marginTop: 2 }} />
    </View>
  )
}

/** Tableau : `widths` = ratios de largeur (flex). Les cellules RETOURNENT A LA LIGNE
 *  automatiquement (react-pdf), plus besoin de tronquer comme en jsPDF. */
export function PdfTable({ headers, rows, widths, theme }: { headers: string[]; rows: string[][]; widths: number[]; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', backgroundColor: theme.primary }}>
        {headers.map((h, i) => <Text key={i} style={{ flex: widths[i], paddingVertical: 4, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{h}</Text>)}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri % 2 ? '#faf9f7' : '#ffffff' }} wrap={false}>
          {row.map((cell, ci) => <Text key={ci} style={{ flex: widths[ci], paddingVertical: 3.5, paddingHorizontal: 5, fontSize: 7.5, color: '#374151' }}>{cell}</Text>)}
        </View>
      ))}
    </View>
  )
}

/** Champ etiquete (fiches NC, blocs). */
export function Field({ label, text, color }: { label: string; text: string; color?: string }): JSX.Element {
  return (
    <View style={{ marginBottom: 5 }}>
      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: color ?? '#6b7280', marginBottom: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#374151' }}>{text}</Text>
    </View>
  )
}
