import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import { SectionBanner, H3, PdfTable } from '../report-kit/components'
import type { NationalRiskSummary } from './model'
import { dimLabel } from './model'

export function RiskSection({ k, theme, num }: { k: NationalRiskSummary; theme: ReportTheme; num: string }): JSX.Element {
  const z = k.exposure.zones
  const zoneRows = [
    ['Critique (>= 60)', String(z.critique)],
    ['À surveiller (30 à 59)', String(z.surveillance)],
    ['Maîtrisé (< 30)', String(z.maitrise)],
    ['Non évalué', String(z.non_evalue)],
  ]
  return (
    <View>
      <SectionBanner num={num} title="Exposition au risque (ISO 27005)" lead="Cartographie de l'exposition et scénarios majeurs" theme={theme} />

      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <H3 theme={theme}>Institutions par zone</H3>
          <PdfTable theme={theme} headers={['Zone', 'Institutions']} widths={[3, 1]} align={['left', 'right']} rows={zoneRows} />
          <Text style={{ fontSize: 8.5, color: '#374151', marginTop: 2 }}>
            Exposition nationale moyenne : {k.exposure.national_avg}/100. Maximum observé : {k.exposure.max}/100.
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <H3 theme={theme}>Exposition par secteur</H3>
          <PdfTable theme={theme} headers={['Secteur', 'Moy.', 'Max']} widths={[2, 1, 1]} align={['left', 'right', 'right']}
            rows={k.exposure.by_sector.map((s) => [s.sector, String(s.avg), String(s.max)])} />
        </View>
      </View>

      <H3 theme={theme}>Scénarios les plus graves</H3>
      <PdfTable theme={theme}
        headers={['Scénario', 'Entité', 'Dimension', 'Expo.']} widths={[3, 2, 1.4, 0.8]} align={['left', 'left', 'left', 'right']}
        rows={k.top_scenarios.map((s) => [s.title, s.org, dimLabel(s.dimension), String(s.exposure)])} />

      <H3 theme={theme}>Infrastructures vitales par dimension</H3>
      <PdfTable theme={theme}
        headers={['Entité', 'Dimension', 'Exposition']} widths={[3, 2, 1]} align={['left', 'left', 'right']}
        rows={k.vitales.heatmap.map((h) => [h.org, dimLabel(h.dimension), String(h.exposure)])} />

      <Text style={{ fontSize: 9, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>
        Traitement : {k.treatment.active_plans} plans actifs, {k.treatment.acceptances} acceptations formelles
        (dont {k.treatment.derogations} dérogation(s)), {k.treatment.overdue_reviews} revue(s) en retard.
      </Text>
    </View>
  )
}
