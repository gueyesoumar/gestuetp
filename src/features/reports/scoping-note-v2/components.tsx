import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import type { MissionRisk } from '../../../types/database.types'

// Sous-composants react-pdf specifiques a la note de cadrage (cartes, Gantt,
// signatures). Les primitives generiques viennent de report-kit. RFC 0021 E2.1.

const RISK = {
  critical: { c: '#c0392b', bg: '#fef2f2', label: 'CRITIQUE' },
  high: { c: '#e67e22', bg: '#fff7ed', label: 'ÉLEVÉ' },
  medium: { c: '#D4A843', bg: '#fdf8e8', label: 'MOYEN' },
  low: { c: '#2d6a4f', bg: '#f0fdf4', label: 'FAIBLE' },
}
const riskTheme = (level: string): { c: string; bg: string; label: string } =>
  RISK[(level as keyof typeof RISK)] ?? RISK.low

/** Encadre a filet lateral (observations, limitations). */
export function Callout({ title, text, tone, theme }: { title: string; text: string; tone: 'gold' | 'forest'; theme: ReportTheme }): JSX.Element {
  const accent = tone === 'gold' ? theme.accent : theme.primary
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6, borderWidth: 0.5, borderColor: theme.border, borderRadius: 2 }} wrap={false}>
      <View style={{ width: 2.5, backgroundColor: accent }} />
      <View style={{ flex: 1, padding: 8 }}>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: accent, marginBottom: 2 }}>{title.toUpperCase()}</Text>
        <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#374151' }}>{text}</Text>
      </View>
    </View>
  )
}

/** Carte d'objectif numerotee. */
export function ObjectiveCard({ num, title, desc, theme }: { num: number; title: string; desc: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, padding: 8, marginBottom: 5 }} wrap={false}>
      <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: theme.ink, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#6b7280' }}>{desc}</Text>
      </View>
    </View>
  )
}

/** Grille 2x2 des dimensions de perimetre. */
export function PerimeterGrid({ cards, theme }: { cards: { accent: string; title: string; text: string }[]; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
      {cards.map((c, i) => (
        <View key={i} style={{ width: '48%', borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, overflow: 'hidden' }} wrap={false}>
          <View style={{ height: 2, backgroundColor: c.accent }} />
          <View style={{ padding: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: theme.ink, marginBottom: 3 }}>{c.title}</Text>
            <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: '#374151' }}>{c.text}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

/** Carte de risque initial + recommandation. */
export function RiskCard({ risk, mitigation, theme }: { risk: MissionRisk; mitigation: string; theme: ReportTheme }): JSX.Element {
  const rt = riskTheme(risk.risk_level)
  return (
    <View style={{ flexDirection: 'row', borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, marginBottom: 6 }} wrap={false}>
      <View style={{ width: 2.5, backgroundColor: rt.c }} />
      <View style={{ flex: 1, padding: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ backgroundColor: rt.bg, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1.5, marginRight: 8 }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: rt.c }}>{rt.label}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: theme.ink }}>{risk.title}</Text>
        </View>
        <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#6b7280', marginBottom: 4 }}>{risk.description ?? '(Pas de description fournie)'}</Text>
        <View style={{ backgroundColor: '#faf9f7', borderRadius: 1.5, padding: 6 }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.primary, marginBottom: 2 }}>RECOMMANDATION INITIALE</Text>
          <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: '#374151' }}>{mitigation}</Text>
        </View>
      </View>
    </View>
  )
}

/** Diagramme de Gantt simplifie (phases proportionnelles). */
export function Gantt({ phases, theme }: { phases: { label: string; pctStart: number; pctW: number }[]; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ marginBottom: 8 }}>
      {phases.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }} wrap={false}>
          <Text style={{ width: 120, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: theme.ink }}>{p.label}</Text>
          <View style={{ flex: 1, height: 8, backgroundColor: '#faf9f7', borderRadius: 1 }}>
            <View style={{ position: 'absolute', left: `${p.pctStart}%`, width: `${p.pctW}%`, top: 1.5, height: 5, backgroundColor: theme.primary, borderRadius: 1 }} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Cartouches de signature (sponsor + roles d'audit). */
export function SignatureRow({ cards, theme }: { cards: { role: string; name: string; subtitle: string }[]; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {cards.map((c, i) => (
        <View key={i} style={{ flex: 1, borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, padding: 8, minHeight: 90 }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: theme.primary }}>{c.role.toUpperCase()}</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: theme.ink, marginTop: 4 }}>{c.name}</Text>
          <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 1 }}>{c.subtitle}</Text>
          <View style={{ marginTop: 'auto', borderTopWidth: 0.5, borderTopColor: theme.border, paddingTop: 4 }}>
            <Text style={{ fontSize: 7, color: '#9ca3af' }}>Date et signature</Text>
          </View>
        </View>
      ))}
    </View>
  )
}
