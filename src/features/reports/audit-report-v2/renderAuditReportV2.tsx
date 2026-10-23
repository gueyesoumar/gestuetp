import type { AuditReportData } from '../generateAuditReportPDF'
import { computeReportRef } from './report-model'

// Moteur de rendu v2 (react-pdf), charge en IMPORT DYNAMIQUE : react-pdf et le
// document restent hors du bundle initial (cohérent avec le code-splitting).
// Rendu 100% cote client (confidentialite des donnees d'audit, D-REP-1).
export async function renderAuditReportV2(data: AuditReportData): Promise<void> {
  const [{ pdf }, { AuditReportDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./AuditReportDocument'),
  ])
  const blob = await pdf(<AuditReportDocument data={data} />).toBlob()
  const ref = computeReportRef(data.mission.id, data.mission.end_date)
  triggerDownload(blob, `rapport-audit-${ref}.pdf`)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
