import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import { SectionBanner, H3, PdfTable } from '../report-kit/components'
import type { NationalRegulSummary } from './model'
import { classifLabel, measureLabel, pct } from './model'

export function RegulSection({ r, theme, num }: { r: NationalRegulSummary; theme: ReportTheme; num: string }): JSX.Element {
  const classifRows = Object.entries(r.findings.by_classification).map(([k, n]) => [classifLabel(k), String(n)])
  const measureRows = Object.entries(r.measures.by_type).map(([k, n]) => [measureLabel(k), String(n)])
  return (
    <View>
      <SectionBanner num={num} title="Supervision réglementaire" lead="Conformité des assujettis et action régulatrice" theme={theme} />

      <H3 theme={theme}>Conformité par secteur</H3>
      <PdfTable theme={theme}
        headers={['Secteur', 'Conformité', 'Assujettis']}
        widths={[2, 1, 1]} align={['left', 'right', 'right']}
        rows={r.conformity.by_sector.map((s) => [s.sector, pct(s.value), String(s.count)])} />

      <H3 theme={theme}>Conformité par référentiel</H3>
      <PdfTable theme={theme}
        headers={['Référentiel', 'Conformité']} widths={[3, 1]} align={['left', 'right']}
        rows={r.conformity.by_referential.map((f) => [f.referentiel, pct(f.value)])} />

      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <H3 theme={theme}>Constats</H3>
          <PdfTable theme={theme} headers={['Classification', 'Nombre']} widths={[2, 1]} align={['left', 'right']} rows={classifRows} />
        </View>
        <View style={{ flex: 1 }}>
          <H3 theme={theme}>Mesures graduées</H3>
          <PdfTable theme={theme} headers={['Palier', 'Nombre']} widths={[2, 1]} align={['left', 'right']} rows={measureRows} />
        </View>
      </View>

      <H3 theme={theme}>Contrôles les plus en écart</H3>
      <PdfTable theme={theme}
        headers={['Contrôle', 'Écarts']} widths={[4, 1]} align={['left', 'right']}
        rows={r.findings.top_controls.map((c) => [`${c.control_code} - ${c.control_name}`, String(c.count)])} />

      <Text style={{ fontSize: 9, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>
        Actions correctives : {r.actions.total} suivies, {r.actions.closed} clôturées, {r.actions.overdue} en retard.
        Actes consignés dans la piste d&rsquo;audit scellée sur la période : {r.audit_trail.events}.
      </Text>
    </View>
  )
}
