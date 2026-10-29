import { pdf } from '@react-pdf/renderer'
import { NationalReportDocument } from './NationalReportDocument'
import type { NationalReportInput } from './model'

// Rendu + telechargement du rapport national (react-pdf, 100% cote client, RFC 0024).
export async function renderNationalReport(input: NationalReportInput): Promise<void> {
  const blob = await pdf(<NationalReportDocument input={input} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Rapport_supervision_nationale_${input.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
