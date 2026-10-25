import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { ReportTheme } from './theme'

// Socle partage : primitives react-pdf communes a tous les documents (chrome de
// page, prose, bandeau de section, sous-titre, tableau, champ etiquete). Generiques,
// pilotees par le theme et des props primitives (pas de type de document en dur).

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
  para: { fontSize: 10, lineHeight: 1.5, color: '#374151', marginBottom: 7 },
})

// Rythme vertical commun (C3) : espacements harmonises entre les 3 documents.
const SP = { section: 14, h3Top: 12, h3Bottom: 5 }

/** Page de contenu avec en-tete, pied et pagination repetes (elements `fixed`),
 *  et filigrane discret. La couverture n'utilise PAS ce wrapper. */
export function ReportPage({ cabinetName, headerRight, footerText, footerLabel, watermark = 'CONFIDENTIEL', theme, children }: {
  cabinetName: string
  headerRight: string
  footerText?: string | null
  footerLabel?: string
  watermark?: string
  theme: ReportTheme
  children: ReactNode
}): JSX.Element {
  return (
    <Page size="A4" style={st.page}>
      <View fixed style={st.header}>
        <View style={st.headerRow}>
          <Text style={[st.headerName, { color: theme.primary, maxLines: 1 }]}>{cabinetName.toUpperCase()}</Text>
          <Text style={st.headerRef}>{headerRight}</Text>
        </View>
        <View style={[st.rule, { backgroundColor: theme.accent }]} />
      </View>

      <Text fixed style={st.watermark}>{watermark}</Text>

      {children}

      <View fixed style={st.footer}>
        <Text style={[st.footerText, { flex: 1, maxLines: 1 }]}>{footerText || footerLabel || ''}</Text>
        <Text style={[st.footerText, { flexShrink: 0, marginLeft: 12 }]} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  )
}

/** Rend une liste de paragraphes (prose issue des narratives). */
export function Prose({ paragraphs }: { paragraphs: string[] }): JSX.Element {
  return (
    <>
      {paragraphs.map((p, i) => <Text key={i} style={st.para}>{p}</Text>)}
    </>
  )
}

/** Bandeau de section numerote (numero + titre + chapeau). `minPresenceAhead` evite
 *  qu'un bandeau reste seul en bas de page (son contenu partant a la page suivante). */
export function SectionBanner({ num, title, lead, theme }: { num: string; title: string; lead?: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ marginBottom: SP.section }} wrap={false} minPresenceAhead={72}>
      <View style={{ backgroundColor: theme.primary, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
        {num ? <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: theme.accent, marginRight: 12 }}>{num}</Text> : null}
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
    <View style={{ marginTop: SP.h3Top, marginBottom: SP.h3Bottom }} wrap={false}>
      <Text style={{ fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: theme.ink }}>{children}</Text>
      <View style={{ height: 0.8, width: 28, backgroundColor: theme.accent, marginTop: 2 }} />
    </View>
  )
}

/** Tableau : `widths` = ratios de largeur (flex). Les cellules RETOURNENT A LA LIGNE
 *  automatiquement (react-pdf), plus besoin de tronquer comme en jsPDF. */
export function PdfTable({ headers, rows, widths, theme, align }: { headers: string[]; rows: string[][]; widths: number[]; theme: ReportTheme; align?: ('left' | 'right')[] }): JSX.Element {
  const ta = (i: number): 'left' | 'right' => align?.[i] ?? 'left'
  return (
    <View style={{ borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: theme.primary }}>
        {headers.map((h, i) => <Text key={i} style={{ flex: widths[i], textAlign: ta(i), paddingVertical: 5, paddingHorizontal: 6, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{h}</Text>)}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri % 2 ? '#faf9f6' : '#ffffff' }} wrap={false}>
          {row.map((cell, ci) => <Text key={ci} style={{ flex: widths[ci], textAlign: ta(ci), paddingVertical: 4, paddingHorizontal: 6, fontSize: 7.5, color: '#374151' }}>{cell}</Text>)}
        </View>
      ))}
    </View>
  )
}

/** Section libre (A2) : bandeau de section + texte redige par le cabinet. Le corps
 *  est decoupe en paragraphes sur les sauts de ligne. Partagee par les 3 documents. */
export function CustomSection({ num, title, body, theme }: { num?: string; title: string; body: string; theme: ReportTheme }): JSX.Element {
  const paragraphs = body.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)
  return (
    <View>
      <SectionBanner num={num ?? ''} title={title} theme={theme} />
      <Prose paragraphs={paragraphs} />
    </View>
  )
}

/** Champ etiquete (fiches, blocs). */
export function Field({ label, text, color }: { label: string; text: string; color?: string }): JSX.Element {
  return (
    <View style={{ marginBottom: 5 }}>
      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: color ?? '#6b7280', marginBottom: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#374151' }}>{text}</Text>
    </View>
  )
}
