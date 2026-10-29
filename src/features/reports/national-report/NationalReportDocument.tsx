import { Document, View } from '@react-pdf/renderer'
import { buildTheme } from '../report-kit/theme'
import { ReportPage } from '../report-kit/components'
import { NationalCover } from './cover'
import { SyntheseSection } from './sections-synthese'
import { RegulSection } from './sections-regul'
import { RiskSection } from './sections-risk'
import { CrossSection } from './sections-cross'
import type { NationalReportInput } from './model'

// Document react-pdf du rapport de supervision nationale (RFC 0024). 100% cote client.
export function NationalReportDocument({ input }: { input: NationalReportInput }): JSX.Element {
  const theme = buildTheme(null, null)
  const n = (i: number): string => String(i + 1).padStart(2, '0')
  const parts: ((num: string) => JSX.Element)[] = []
  parts.push((num) => <SyntheseSection input={input} theme={theme} num={num} variant={input.variant} />)
  if (input.variant !== 'risk') parts.push((num) => <RegulSection r={input.regul} theme={theme} num={num} />)
  if (input.variant !== 'regul') parts.push((num) => <RiskSection k={input.risk} theme={theme} num={num} />)
  parts.push((num) => <CrossSection input={input} theme={theme} num={num} variant={input.variant} />)

  return (
    <Document title={`Rapport de supervision nationale - ${input.periodLabel}`}>
      <NationalCover input={input} theme={theme} />
      <ReportPage
        cabinetName={input.authorityName}
        headerRight="Rapport de supervision nationale · Confidentiel"
        footerLabel="Rapport de supervision nationale · Confidentiel · Diffusion restreinte"
        theme={theme}
      >
        {parts.map((render, i) => (
          <View key={i} break={i !== 0}>{render(n(i))}</View>
        ))}
      </ReportPage>
    </Document>
  )
}
