import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { describeVerdict, generateContextNarrative, generateMethodologyNarrative, generateExecutiveNarrative, generateDomainNarrative } from '../auditReportNarratives'
import { Prose, SectionBanner, H3 } from './components'
import { RadarChart } from './charts'
import { RecommendationsSection } from './recommendations'
import { NCFactSheetsSection } from './nc-fiches'
import { ActionPlanSection, ConclusionSection } from './action-conclusion'
import { AnnexGlossarySection, AnnexEvidenceSection, AnnexReferencesSection, AnnexDistributionSection } from './annexes'
import type { DecoratedData, ReportTheme } from './report-model'

export interface SectionProps {
  data: DecoratedData
  theme: ReportTheme
}

const s = StyleSheet.create({
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 4, marginBottom: 14 },
  scoreNum: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  scoreLabel: { fontSize: 8, color: '#dfe8e3' },
  verdict: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  kpi: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderRadius: 4, padding: 8 },
  kpiVal: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  domHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f4f6', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3 },
  domName: { flex: 1, fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginRight: 8 },
  domScore: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  domStats: { fontSize: 8, marginTop: 3 },
})

function Kpi({ label, value, sub, color, theme }: { label: string; value: string; sub: string; color: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={[s.kpi, { borderColor: theme.border }]}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.muted }}>{label.toUpperCase()}</Text>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
      <Text style={{ fontSize: 7, marginTop: 2, color: theme.muted }}>{sub}</Text>
    </View>
  )
}

export function ContextSection({ data, theme }: SectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num="01" title="Contexte de la mission" lead="Périmètre, objectifs et cadre de l'audit" theme={theme} />
      <Prose paragraphs={generateContextNarrative(data)} />
    </View>
  )
}

export function MethodologySection({ data, theme }: SectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num="02" title="Méthodologie" lead="Démarche, référentiel et barème d'évaluation" theme={theme} />
      <Prose paragraphs={generateMethodologyNarrative(data)} />
    </View>
  )
}

export function SynthesisSection({ data, theme }: SectionProps): JSX.Element {
  const t = data.totals
  const v = describeVerdict(t.conformityScore, t.ncMajor)
  const vColor = v.label === 'Favorable' ? '#15803d' : v.label === 'Favorable avec réserves' ? theme.accent : v.label === 'Réservée' ? '#c2410c' : '#b91c1c'
  return (
    <View>
      <SectionBanner num="03" title="Synthèse exécutive" lead="Score de conformité, opinion et chiffres clés" theme={theme} />
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
      <H3 theme={theme}>Lecture rapide</H3>
      <Prose paragraphs={generateExecutiveNarrative(data)} />
    </View>
  )
}

export function DomainDetailsSection({ data, theme }: SectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num="04" title="Résultats par domaine" lead="Score et analyse de chaque domaine du référentiel" theme={theme} />
      <View style={{ alignItems: 'center', marginBottom: 10 }} wrap={false}>
        <RadarChart stats={data.domainStats} theme={theme} />
      </View>
      {data.domainStats.map((d) => {
        const color = d.score >= 80 ? '#15803d' : d.score >= 60 ? theme.accent : '#b91c1c'
        return (
          <View key={d.code} style={{ marginBottom: 10 }}>
            <View style={s.domHead} wrap={false}>
              <Text style={[s.domName, { color: theme.ink }]}>{d.code} : {d.name}</Text>
              <Text style={[s.domScore, { color }]}>{d.score}%</Text>
            </View>
            <Text style={[s.domStats, { color: theme.muted }]}>
              {d.scored}/{d.total} contrôles évalués {'·'} {d.conformes} conformes {'·'} {d.ncMajor} NC maj {'·'} {d.ncMinor} NC min {'·'} {d.observations} obs.
            </Text>
            <Prose paragraphs={generateDomainNarrative(d, data)} />
          </View>
        )
      })}
    </View>
  )
}

/** Registre des sections de CONTENU (hors front-matter). Fondation des templates (D-REP-2). */
export interface ContentSection {
  key: string
  title: string
  Component: (props: SectionProps) => JSX.Element
}

export const CONTENT_SECTIONS: ContentSection[] = [
  { key: 'context', title: 'Contexte de la mission', Component: ContextSection },
  { key: 'methodology', title: 'Méthodologie', Component: MethodologySection },
  { key: 'synthesis', title: 'Synthèse exécutive', Component: SynthesisSection },
  { key: 'domains', title: 'Résultats par domaine', Component: DomainDetailsSection },
  { key: 'nc_fiches', title: 'Fiches de non-conformités majeures', Component: NCFactSheetsSection },
  { key: 'recommendations', title: 'Recommandations', Component: RecommendationsSection },
  { key: 'action_plan', title: 'Plan d’action', Component: ActionPlanSection },
  { key: 'conclusion', title: 'Conclusion', Component: ConclusionSection },
  { key: 'annex_glossary', title: 'Annexe A - Glossaire', Component: AnnexGlossarySection },
  { key: 'annex_evidence', title: 'Annexe B - Preuves examinées', Component: AnnexEvidenceSection },
  { key: 'annex_references', title: 'Annexe C - Références normatives', Component: AnnexReferencesSection },
  { key: 'annex_distribution', title: 'Annexe D - Liste de diffusion', Component: AnnexDistributionSection },
]
