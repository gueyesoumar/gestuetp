import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import { SectionBanner, H3, PdfTable, Prose } from '../report-kit/components'
import type { NationalReportInput } from './model'
import { pct } from './model'

export function CrossSection({ input, theme, num }: { input: NationalReportInput; theme: ReportTheme; num: string }): JSX.Element {
  const expoBySector = new Map(input.risk.exposure.by_sector.map((s) => [s.sector, s.avg]))
  const rows = input.regul.conformity.by_sector
    .map((s) => ({ sector: s.sector, conf: s.value, expo: expoBySector.get(s.sector) ?? 0 }))
    .sort((a, b) => b.expo - a.expo)
    .map((s) => [s.sector, pct(s.conf), `${s.expo}/100`])
  return (
    <View>
      <SectionBanner num={num} title="Lecture croisée et décisions" lead="Là où une faible conformité rencontre une forte exposition" theme={theme} />
      <Text style={{ fontSize: 10, color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>
        Le danger se concentre sur les secteurs à la fois peu conformes et fortement exposés. C&rsquo;est l&rsquo;apport de l&rsquo;intégration supervision et risque : orienter l&rsquo;effort de l&rsquo;État vers les écarts qui produisent le risque le plus grave, et non vers les moins conformes en général.
      </Text>
      <PdfTable theme={theme}
        headers={['Secteur', 'Conformité', 'Exposition']} widths={[2, 1, 1]} align={['left', 'right', 'right']}
        rows={rows} />

      <H3 theme={theme}>Décisions soumises au Président</H3>
      <Prose paragraphs={[
        '1. Cadre légal contraignant : rendre obligatoires la déclaration des incidents majeurs et les audits de sécurité, et assortir la supervision d’un régime de sanctions. Sans ce levier, la gradation s’arrête au rappel.',
        '2. Plan d’urgence sur les infrastructures vitales exposées : jalons et revue trimestrielle par l’autorité, en ciblant d’abord l’authentification forte et les sauvegardes testées.',
        '3. Investir dans la capacité de cyber-résilience nationale : compétences, supervision continue, coopération régionale.',
        '4. Encadrer la chaîne des prestataires sensibles : qualification obligatoire sur les fonctions critiques de l’État.',
      ]} />

      <H3 theme={theme}>Annexes</H3>
      <Prose paragraphs={[
        'Échelle d’exposition (ISO 27005) : exposition = vraisemblance x impact, normalisée sur 100. Maîtrisé < 30 ; à surveiller 30 à 59 ; critique >= 60.',
        'Conformité : taux dérivé du scoring de clôture de mission (conforme 100, largement conforme 75, partiellement conforme 50, non conforme 0).',
        'Vitale (IIC) : infrastructure d’importance critique dont la défaillance affecte la nation. Les chiffres reflètent les données vérifiées à la date d’édition.',
      ]} />
    </View>
  )
}
